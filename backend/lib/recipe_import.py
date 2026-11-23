"""SSRF-safe recipe fetcher and Schema.org Recipe JSON-LD parser."""

from __future__ import annotations

import html
import ipaddress
import json
import re
import socket
import urllib.parse
from contextlib import contextmanager
from html.parser import HTMLParser
from typing import Any, Optional

import httpx

MAX_IMPORT_BYTES = 1024 * 1024  # 1MB
DEFAULT_FETCH_TIMEOUT = 8.0  # seconds
MAX_REDIRECTS = 3

COMMON_UNITS = {
    "cup", "cups", "c", "c.", "tbsp", "tbs", "tablespoon", "tablespoons",
    "tsp", "teaspoon", "teaspoons", "oz", "ounce", "ounces", "fl oz", "fluid ounce", "fluid ounces",
    "lb", "lbs", "pound", "pounds", "g", "gram", "grams", "kg", "kilogram", "kilograms",
    "ml", "milliliter", "milliliters", "l", "liter", "liters",
    "pinch", "pinches", "dash", "dashes", "clove", "cloves", "can", "cans",
    "package", "packages", "pkg", "pkgs", "slice", "slices", "bunch", "bunches",
    "head", "heads", "stalk", "stalks", "piece", "pieces", "pt", "pint", "pints",
    "qt", "quart", "quarts", "gal", "gallon", "gallons"
}


class SSRFError(ValueError):
    """Raised when a URL violates SSRF safety rules."""


class RecipeNotFoundError(ValueError):
    """Raised when no Schema.org Recipe JSON-LD is found on the page."""


class ContentTooLargeError(ValueError):
    """Raised when response body exceeds maximum allowed size."""


# Extra networks not always covered by ipaddress flags (CGNAT, this-host, benchmarking).
_BLOCKED_NETWORKS = (
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("198.18.0.0/15"),
)


def is_ip_blocked(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Check if an IP address belongs to private, loopback, link-local, or reserved ranges."""
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped

    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_unspecified
        or ip.is_reserved
        or str(ip) == "169.254.169.254"
    ):
        return True
    return any(ip in network for network in _BLOCKED_NETWORKS)


def validate_url_for_ssrf(url: str) -> urllib.parse.SplitResult:
    """Validate scheme, credentials, and host syntax."""
    if not isinstance(url, str) or not url.strip():
        raise SSRFError("URL cannot be empty")

    trimmed = url.strip()
    parsed = urllib.parse.urlsplit(trimmed)

    if parsed.scheme.lower() not in ("http", "https"):
        raise SSRFError("Only http and https protocols are supported")

    if parsed.username is not None or parsed.password is not None or "@" in parsed.netloc:
        raise SSRFError("URLs with embedded credentials or userinfo are not allowed")

    if not parsed.hostname:
        raise SSRFError("URL must include a valid hostname")

    # If an explicit port is supplied, only allow standard web ports
    if parsed.port is not None and parsed.port not in (80, 443, 8080, 8443):
        raise SSRFError(f"Port {parsed.port} is not allowed")

    return parsed



def sanitize_stored_url(url: Optional[str]) -> Optional[str]:
    """Allow storing only http(s) URLs with no credentials or literal blocked IPs. Does not fetch or resolve DNS."""
    if not url or not isinstance(url, str):
        return None
    trimmed = url.strip()
    if not trimmed:
        return None
    parsed = validate_url_for_ssrf(trimmed)
    if not parsed.hostname:
        return None
    try:
        ip = ipaddress.ip_address(parsed.hostname.strip("[]"))
    except ValueError:
        return trimmed
    if is_ip_blocked(ip):
        raise SSRFError("URL host is not allowed")
    return trimmed


def resolve_and_verify_hostname(hostname: str, port: int) -> list[str]:
    """Resolve hostname and ensure none of the resolved IPs are in blocked ranges."""
    # Check if hostname is already a literal IP
    try:
        ip = ipaddress.ip_address(hostname.strip("[]"))
        if is_ip_blocked(ip):
            raise SSRFError(f"IP address {hostname} is in a blocked or private range")
        return [str(ip)]
    except ValueError:
        pass  # It's a DNS hostname

    try:
        addrinfo = socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise SSRFError(f"DNS resolution failed for {hostname}: {exc}")

    if not addrinfo:
        raise SSRFError(f"Could not resolve any IP addresses for {hostname}")

    verified_ips: list[str] = []
    for info in addrinfo:
        sockaddr = info[4]
        ip_str = sockaddr[0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            raise SSRFError(f"Invalid resolved IP address: {ip_str}")

        if is_ip_blocked(ip):
            raise SSRFError(f"Hostname {hostname} resolved to a blocked/private IP: {ip_str}")
        verified_ips.append(ip_str)

    return verified_ips



@contextmanager
def _pin_dns(hostname: str, port: int, verified_ips: list[str]):
    """During the HTTP connect, reuse already-verified IPs instead of resolving again (DNS rebinding)."""
    original = socket.getaddrinfo
    hostname_cmp = hostname.strip("[]").lower()
    allowed = {hostname_cmp, *(ip.strip("[]") for ip in verified_ips)}

    def _pinned(host, port_arg, *args, **kwargs):  # noqa: ANN001
        host_cmp = str(host or "").strip("[]").lower()
        if host_cmp not in allowed:
            raise SSRFError("Blocked unexpected host lookup during fetch")
        results = []
        connect_port = port if port_arg is None else int(port_arg)
        for ip in verified_ips:
            ip_obj = ipaddress.ip_address(ip)
            family = socket.AF_INET6 if ip_obj.version == 6 else socket.AF_INET
            sockaddr = (ip, connect_port, 0, 0) if ip_obj.version == 6 else (ip, connect_port)
            results.append((family, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", sockaddr))
        if not results:
            raise SSRFError("No verified addresses available for connect")
        return results

    socket.getaddrinfo = _pinned  # type: ignore[method-assign]
    try:
        yield
    finally:
        socket.getaddrinfo = original


def fetch_url_html(
    url: str,
    max_redirects: int = MAX_REDIRECTS,
    timeout: float = DEFAULT_FETCH_TIMEOUT,
    max_bytes: int = MAX_IMPORT_BYTES,
) -> str:
    """Safely fetch HTML with manual redirect checks and size streaming."""
    current_url = url.strip()
    redirects_followed = 0

    # trust_env=False: do not honor HTTP_PROXY, which would bypass IP checks.
    with httpx.Client(timeout=timeout, follow_redirects=False, trust_env=False) as client:
        while True:
            parsed = validate_url_for_ssrf(current_url)
            if not parsed.hostname:
                raise SSRFError("URL must include a valid hostname")
            port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
            verified_ips = resolve_and_verify_hostname(parsed.hostname, port)

            try:
                request = client.build_request(
                    "GET",
                    current_url,
                    headers={
                        "User-Agent": "PantryHub-RecipeImporter/1.0 (+https://www.mypantryhub.com)",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    },
                )
                with _pin_dns(parsed.hostname, port, verified_ips):
                    response = client.send(request, stream=True)
            except SSRFError:
                raise
            except httpx.RequestError:
                raise SSRFError("Failed to fetch the page")

            # Check redirect status
            if response.status_code in (301, 302, 303, 307, 308):
                response.close()
                redirects_followed += 1
                if redirects_followed > max_redirects:
                    raise SSRFError(f"Exceeded maximum redirect limit of {max_redirects}")

                location = response.headers.get("Location")
                if not location:
                    raise SSRFError("Redirect response missing Location header")

                current_url = urllib.parse.urljoin(current_url, location)
                continue

            if response.status_code != 200:
                response.close()
                raise SSRFError(f"HTTP request returned status {response.status_code}")

            # Read and stream body with size cap
            body_bytes = bytearray()
            try:
                for chunk in response.iter_bytes(chunk_size=8192):
                    body_bytes.extend(chunk)
                    if len(body_bytes) > max_bytes:
                        raise ContentTooLargeError(f"Response size exceeded {max_bytes} bytes")
            finally:
                response.close()

            encoding = response.encoding or "utf-8"
            return body_bytes.decode(encoding, errors="replace")


def clean_ingredient_name(raw: str) -> str:
    """Parse a conservative ingredient name by stripping a leading quantity and unit."""
    if not raw or not isinstance(raw, str):
        return ""

    text = html.unescape(raw).strip()
    text = re.sub(r"\s+", " ", text)

    # Strip leading quantity: numbers, fractions, decimals, mixed numbers, unicode fractions
    qty_pattern = r"^[\d\s\./\-\u00BC-\u00BE\u2150-\u215E]+"
    m = re.match(qty_pattern, text)
    if m:
        remaining = text[m.end():].strip()
        if remaining:
            text = remaining

    # Check for unit at the start of remaining words
    words = text.split(" ")
    if len(words) > 1:
        # Check two-word unit (e.g. 'fl oz', 'fluid ounce')
        two_words = f"{words[0]} {words[1]}".lower().rstrip(".,")
        if two_words in COMMON_UNITS:
            words = words[2:]
        elif words[0].lower().rstrip(".,") in COMMON_UNITS:
            words = words[1:]
        text = " ".join(words).strip()
    elif len(words) == 1:
        if words[0].lower().rstrip(".,") in COMMON_UNITS:
            text = ""

    # Strip leading 'of ' (e.g., 'of olive oil')
    if text.lower().startswith("of "):
        text = text[3:].strip()

    # Clean leading/trailing punctuation
    text = re.sub(r"^[,;\-\s]+", "", text)
    text = re.sub(r"[,;\-\s]+$", "", text)
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text


class _JSONLDExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_script = False
        self.scripts: list[str] = []
        self._buf: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        if tag.lower() == "script":
            attr_dict = {k.lower(): (v or "").strip().lower() for k, v in attrs}
            if attr_dict.get("type") == "application/ld+json":
                self.in_script = True
                self._buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "script" and self.in_script:
            self.in_script = False
            self.scripts.append("".join(self._buf))
            self._buf = []

    def handle_data(self, data: str) -> None:
        if self.in_script:
            self._buf.append(data)


def _is_recipe_type(val: Any) -> bool:
    if isinstance(val, str):
        cleaned = val.strip().lower()
        return cleaned == "recipe" or cleaned.endswith("/recipe") or cleaned.endswith("#recipe")
    if isinstance(val, list):
        return any(_is_recipe_type(item) for item in val)
    return False


def _find_recipe_dicts(obj: Any) -> list[dict[str, Any]]:
    recipes: list[dict[str, Any]] = []
    if isinstance(obj, dict):
        if _is_recipe_type(obj.get("@type") or obj.get("type")):
            recipes.append(obj)
        if "@graph" in obj:
            recipes.extend(_find_recipe_dicts(obj["@graph"]))
        for v in obj.values():
            if isinstance(v, (dict, list)):
                recipes.extend(_find_recipe_dicts(v))
    elif isinstance(obj, list):
        for item in obj:
            recipes.extend(_find_recipe_dicts(item))
    return recipes


def parse_recipe_json_ld(html_content: str, source_url: Optional[str] = None) -> dict[str, Any]:
    """Extract and parse Schema.org Recipe data from HTML content."""
    parser = _JSONLDExtractor()
    try:
        parser.feed(html_content)
    except Exception:
        pass

    if not parser.scripts:
        raise RecipeNotFoundError("No JSON-LD metadata found on page")

    candidate_recipes: list[dict[str, Any]] = []
    for script_text in parser.scripts:
        cleaned = script_text.strip()
        if not cleaned:
            continue
        try:
            parsed_data = json.loads(cleaned)
        except Exception:
            continue
        candidate_recipes.extend(_find_recipe_dicts(parsed_data))

    if not candidate_recipes:
        raise RecipeNotFoundError("No Schema.org Recipe found on page")

    # Select the first recipe that contains a title and at least one ingredient
    for recipe in candidate_recipes:
        title = recipe.get("name") or recipe.get("headline")
        if not title or not isinstance(title, str) or not title.strip():
            continue

        raw_ingredients = recipe.get("recipeIngredient") or recipe.get("ingredients")
        if not raw_ingredients:
            continue

        if isinstance(raw_ingredients, str):
            raw_ingredients = [raw_ingredients]
        elif not isinstance(raw_ingredients, list):
            continue

        ingredients_list: list[dict[str, str]] = []
        for raw_item in raw_ingredients:
            if not isinstance(raw_item, str):
                continue
            line = html.unescape(raw_item).strip()
            if not line:
                continue
            name = clean_ingredient_name(line)
            ingredients_list.append({"raw": line, "name": name or line})

        if not ingredients_list:
            continue

        # Extract instructions
        instructions_list: list[str] = []
        raw_instructions = recipe.get("recipeInstructions")
        if isinstance(raw_instructions, str):
            for step in raw_instructions.splitlines():
                s = html.unescape(step).strip()
                if s:
                    instructions_list.append(s)
        elif isinstance(raw_instructions, list):
            for step in raw_instructions:
                if isinstance(step, str) and step.strip():
                    instructions_list.append(html.unescape(step.strip()))
                elif isinstance(step, dict):
                    text = step.get("text") or step.get("name")
                    if text and isinstance(text, str) and text.strip():
                        instructions_list.append(html.unescape(text.strip()))
                    elif "itemListElement" in step:
                        for sub in step.get("itemListElement", []):
                            if isinstance(sub, dict):
                                sub_text = sub.get("text") or sub.get("name")
                                if sub_text and isinstance(sub_text, str) and sub_text.strip():
                                    instructions_list.append(html.unescape(sub_text.strip()))
                            elif isinstance(sub, str) and sub.strip():
                                instructions_list.append(html.unescape(sub.strip()))

        # Servings
        servings: Optional[str] = None
        raw_servings = recipe.get("recipeYield") or recipe.get("yield")
        if raw_servings is not None:
            if isinstance(raw_servings, list) and raw_servings:
                servings = str(raw_servings[0]).strip()
            else:
                servings = str(raw_servings).strip()

        # Image URL string only (never fetched or displayed in v1)
        image_url: Optional[str] = None
        raw_image = recipe.get("image")
        if isinstance(raw_image, str) and raw_image.strip():
            image_url = raw_image.strip()
        elif isinstance(raw_image, list) and raw_image:
            first = raw_image[0]
            if isinstance(first, str) and first.strip():
                image_url = first.strip()
            elif isinstance(first, dict) and first.get("url"):
                image_url = str(first["url"]).strip()
        elif isinstance(raw_image, dict) and raw_image.get("url"):
            image_url = str(raw_image["url"]).strip()

        return {
            "title": html.unescape(title).strip(),
            "sourceUrl": source_url,
            "imageUrl": image_url,
            "servings": servings,
            "ingredients": ingredients_list,
            "instructions": instructions_list,
        }

    raise RecipeNotFoundError("Recipe data missing required name or ingredients")
