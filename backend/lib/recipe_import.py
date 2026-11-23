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


class SiteBlockedError(ValueError):
    """Raised when upstream recipe site blocks our fetch (401, 403, 429, or bot challenge)."""


class RecipeNotFoundError(ValueError):
    """Raised when no Schema.org Recipe JSON-LD is found on the page."""


class ContentTooLargeError(ValueError):
    """Raised when response body exceeds maximum allowed size."""


TRACKING_PARAM_PREFIXES = ("utm_", "mtm_", "hsa_")
TRACKING_PARAM_NAMES = {
    "fbclid", "gclid", "gclsrc", "dclid", "gbraid", "wbraid", "msclkid",
    "twclid", "ttclid", "li_fat_id", "mc_eid", "mc_cid", "igshid", "yclid",
    "_hsenc", "_hsmi", "mkt_tok", "srsltid", "ncid", "ocid", "icid",
    "pk_campaign", "pk_kwd",
}


def is_tracking_param(name: str) -> bool:
    lower = name.lower()
    if lower in TRACKING_PARAM_NAMES:
        return True
    return lower.startswith(TRACKING_PARAM_PREFIXES)


def strip_tracking_params(url: Optional[str]) -> Optional[str]:
    """Strip marketing and tracking query parameters from a URL while preserving other params."""
    if not url or not isinstance(url, str):
        return url
    trimmed = url.strip()
    if not trimmed:
        return trimmed

    parsed = urllib.parse.urlsplit(trimmed)
    if not parsed.query:
        return trimmed

    query_params = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    filtered = [(k, v) for k, v in query_params if not is_tracking_param(k)]

    new_query = urllib.parse.urlencode(filtered) if filtered else ""
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment))


def is_bot_challenge_page(body: str) -> bool:
    """Detect bot challenge or access-denied pages (Cloudflare, Akamai, captcha, etc.)."""
    if not body or not isinstance(body, str):
        return False
    lower = body.lower()
    if "<title>just a moment...</title>" in lower or "<title>just a moment</title>" in lower:
        return True
    if "attention required! | cloudflare" in lower:
        return True
    if "cf-chl-opt" in lower or "challenges.cloudflare.com" in lower:
        return True
    if "<title>access denied</title>" in lower and (
        "permission to access" in lower or "reference #" in lower or "akamai" in lower or "blocked" in lower
    ):
        return True
    if "please verify you are a human" in lower or "verify you are human" in lower:
        return True
    if "checking if the site connection is secure" in lower and "cloudflare" in lower:
        return True
    return False



GENERIC_SLUG_SEGMENTS = {
    "recipe", "recipes", "receta", "recette", "rezept", "article", "articles",
    "post", "posts", "food", "cooking", "index", "html", "htm", "www", "en", "us", "blog",
}
ROMAN_NUMERALS = {
    "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
    "xi", "xii", "xiii", "xiv", "xv",
}
CHALLENGE_TITLE_MARKERS = (
    "just a moment",
    "attention required",
    "access denied",
    "access to this page has been denied",
    "403 forbidden",
    "cloudflare",
)


def _is_challenge_title(title: str) -> bool:
    lower = title.lower()
    return any(marker in lower for marker in CHALLENGE_TITLE_MARKERS)


def title_from_source_url(url: Optional[str]) -> str:
    """Build a display title from a recipe URL slug, dropping numeric ids."""
    fallback = "Saved recipe"
    if not url or not isinstance(url, str):
        return fallback
    parsed = urllib.parse.urlsplit(url.strip())
    parts = [urllib.parse.unquote(part) for part in parsed.path.split("/") if part]
    cleaned: list[str] = []
    for part in parts:
        part = re.sub(r"\.(html|htm|php|aspx)$", "", part, flags=re.I)
        if not part or re.fullmatch(r"\d+", part):
            continue
        if part.lower() in GENERIC_SLUG_SEGMENTS:
            continue
        # Drop a trailing numeric id on the slug itself (neiman-marcus-cake-ii-12345)
        part = re.sub(r"[-_][0-9]{3,}$", "", part)
        if part and not re.fullmatch(r"\d+", part):
            cleaned.append(part)
    if not cleaned:
        return fallback
    words = [w for w in re.split(r"[-_]+", cleaned[-1]) if w]
    titled: list[str] = []
    for word in words:
        if word.lower() in ROMAN_NUMERALS:
            titled.append(word.upper())
        elif word.isupper() and len(word) > 1:
            titled.append(word)
        else:
            titled.append(word[0].upper() + word[1:].lower())
    return " ".join(titled) or fallback


def extract_og_title(html_content: Optional[str]) -> Optional[str]:
    """Pull og:title, twitter:title, or <title> from HTML, ignoring challenge pages."""
    if not html_content or not isinstance(html_content, str):
        return None
    patterns = (
        r'<meta\b[^>]*\bproperty=["\']og:title["\'][^>]*\bcontent=["\']([^"\']+)["\']',
        r'<meta\b[^>]*\bcontent=["\']([^"\']+)["\'][^>]*\bproperty=["\']og:title["\']',
        r'<meta\b[^>]*\bname=["\']twitter:title["\'][^>]*\bcontent=["\']([^"\']+)["\']',
        r'<meta\b[^>]*\bcontent=["\']([^"\']+)["\'][^>]*\bname=["\']twitter:title["\']',
    )
    for pattern in patterns:
        match = re.search(pattern, html_content, flags=re.I)
        if match:
            title = html.unescape(match.group(1)).strip()
            if title and not _is_challenge_title(title):
                return title
    match = re.search(r"<title[^>]*>(.*?)</title>", html_content, flags=re.I | re.S)
    if match:
        title = html.unescape(re.sub(r"\s+", " ", match.group(1))).strip()
        if title and not _is_challenge_title(title):
            return title
    return None


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
    trimmed = strip_tracking_params(url.strip())
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
    current_url = strip_tracking_params(url.strip()) or ""
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

            if response.status_code in (401, 403, 429):
                response.close()
                raise SiteBlockedError(f"Site blocked automated request (status {response.status_code})")

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
            decoded_body = body_bytes.decode(encoding, errors="replace")

            if is_bot_challenge_page(decoded_body):
                raise SiteBlockedError("Site presented a bot challenge or access denied page")

            return decoded_body


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

    # Strip parenthetical size/quantity, e.g. (18.25 ounce) or (8 oz)
    paren_qty_pattern = r"^\([\d\s\./\-\u00BC-\u00BE\u2150-\u215E]+[a-zA-Z\s\.]*\)\s*"
    m2 = re.match(paren_qty_pattern, text)
    if m2:
        remaining = text[m2.end():].strip()
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
    """Extract and parse Schema.org Recipe data from HTML content or bare JSON."""
    parser = _JSONLDExtractor()
    try:
        parser.feed(html_content)
    except Exception:
        pass

    candidate_recipes: list[dict[str, Any]] = []
    if parser.scripts:
        for script_text in parser.scripts:
            cleaned = script_text.strip()
            if not cleaned:
                continue
            try:
                parsed_data = json.loads(cleaned)
            except Exception:
                continue
            candidate_recipes.extend(_find_recipe_dicts(parsed_data))

    # If no scripts extracted from <script type="application/ld+json">,
    # try bare JSON or script tags without type
    if not candidate_recipes:
        trimmed = html_content.strip()
        script_match = re.search(r"<script[^>]*>(.*?)</script>", trimmed, flags=re.DOTALL | re.IGNORECASE)
        if script_match:
            try:
                candidate_recipes.extend(_find_recipe_dicts(json.loads(script_match.group(1).strip())))
            except Exception:
                pass

        if not candidate_recipes and (trimmed.startswith("{") or trimmed.startswith("[")):
            try:
                candidate_recipes.extend(_find_recipe_dicts(json.loads(trimmed)))
            except Exception:
                pass

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


INGREDIENTS_HEADER_RE = re.compile(
    r"^(?:#{1,6}\s*|\*{1,2}\s*)?(?:ingredients?|what you(?:\x27ll| will) need)(?:\s*:)?(?:\s*\*{1,2})?\s*$",
    re.IGNORECASE,
)
INSTRUCTIONS_HEADER_RE = re.compile(
    r"^(?:#{1,6}\s*|\*{1,2}\s*)?(?:directions?|instructions?|steps?|method|preparation|how to make(?: it)?|procedure)(?:\s*:)?(?:\s*\*{1,2})?\s*$",
    re.IGNORECASE,
)
OTHER_SECTION_HEADER_RE = re.compile(
    r"^(?:#{1,6}\s*|\*{1,2}\s*)?(?:notes?|cook\x27?s? notes?|nutrition(?: facts| information)?|tips?|equipment|source)(?:\s*:)?(?:\s*\*{1,2})?\s*$",
    re.IGNORECASE,
)
SERVINGS_RE = re.compile(
    r"^(?:servings?|yields?|makes)\s*:\s*(.+)$",
    re.IGNORECASE,
)
METADATA_LINE_RE = re.compile(
    r"^(?:(?:prep|cook|total|active|additional|chill|bake)\s*time|jump to recipe|print recipe|save recipe|rate this|ratings?|reviews?|\d+(\.\d+)?\s*(?:stars?|out of 5)|author|course|cuisine)\s*:",
    re.IGNORECASE,
)


def _is_quantity_leading(line: str) -> bool:
    clean = re.sub(r"^[\*\-•▪▫\+]\s*", "", line).strip()
    return bool(re.match(r"^[\d\u00BC-\u00BE\u2150-\u215E]", clean))


def _is_bullet_line(line: str) -> bool:
    return bool(re.match(r"^[\*\-•▪▫\+]\s+\S", line))


def _is_numbered_step(line: str) -> bool:
    return bool(re.match(r"^(?:step\s*\d+[:.]?\s*|\d+[\.\)\:]\s+)", line, re.I))


def parse_pasted_recipe(text: str, source_url: Optional[str] = None) -> dict[str, Any]:
    """Parse pasted recipe text or HTML into a draft recipe."""
    if not text or not isinstance(text, str) or not text.strip():
        raise ValueError("Recipe text cannot be empty")

    trimmed = text.strip()
    clean_source = strip_tracking_params(source_url) if source_url else None

    # 1. Try Schema.org JSON-LD first (handles HTML-wrapped ld+json, bare JSON object/array/@graph, or script tag)
    try:
        recipe = parse_recipe_json_ld(trimmed, source_url=clean_source)
        if recipe.get("title") and recipe.get("ingredients"):
            return recipe
    except (RecipeNotFoundError, Exception):
        pass

    # 2. Heuristic parsing
    cleaned_text = trimmed
    if re.search(r"<(?:p|br|li|h[1-6]|div|tr)[\s/>]", cleaned_text, flags=re.I):
        converted = re.sub(r"<(?:br|/li|/p|/div|/h[1-6]|/tr)[\s/>]", "\n", cleaned_text, flags=re.I)
        converted = re.sub(r"<[^>]+>", "", converted)
        cleaned_text = html.unescape(converted)

    raw_lines = [html.unescape(l).strip() for l in cleaned_text.splitlines()]
    lines = [l for l in raw_lines if l]

    if not lines:
        raise ValueError("Could not parse recipe: text is empty")

    title: Optional[str] = None
    servings: Optional[str] = None
    ingredients: list[dict[str, str]] = []
    instructions: list[str] = []
    current_section = "HEADER"

    for line in lines:
        if INGREDIENTS_HEADER_RE.match(line):
            current_section = "INGREDIENTS"
            continue
        if INSTRUCTIONS_HEADER_RE.match(line):
            current_section = "INSTRUCTIONS"
            continue
        if OTHER_SECTION_HEADER_RE.match(line):
            current_section = "OTHER"
            continue

        serv_match = SERVINGS_RE.match(line)
        if serv_match:
            if not servings:
                servings = serv_match.group(1).strip()
            continue

        if (
            METADATA_LINE_RE.match(line)
            or re.match(r"^(?:jump to recipe|print recipe|save recipe)$", line, re.I)
            or re.match(r"^https?://", line, re.I)
        ):
            continue

        if current_section == "HEADER":
            if _is_bullet_line(line) or _is_quantity_leading(line):
                current_section = "INGREDIENTS"
                clean_item = re.sub(r"^[\*\-•▪▫\+]\s*", "", line).strip()
                if clean_item:
                    name = clean_ingredient_name(clean_item)
                    ingredients.append({"raw": clean_item, "name": name or clean_item})
                continue

            if _is_numbered_step(line):
                current_section = "INSTRUCTIONS"
                clean_step = re.sub(r"^(?:step\s*\d+[:.]?\s*|\d+[\.\)\:]\s*)", "", line, flags=re.I).strip()
                clean_step = re.sub(r"^[\*\-•▪▫\+]\s*", "", clean_step).strip()
                if clean_step:
                    instructions.append(clean_step)
                continue

            if not title:
                candidate = re.sub(r"^#{1,6}\s*", "", line).strip()
                candidate = re.sub(r"^\*{1,2}|\*{1,2}$", "", candidate).strip()
                if candidate and len(candidate) <= 200:
                    title = candidate
            continue

        if current_section == "INGREDIENTS":
            if _is_numbered_step(line):
                current_section = "INSTRUCTIONS"
                clean_step = re.sub(r"^(?:step\s*\d+[:.]?\s*|\d+[\.\)\:]\s*)", "", line, flags=re.I).strip()
                clean_step = re.sub(r"^[\*\-•▪▫\+]\s*", "", clean_step).strip()
                if clean_step:
                    instructions.append(clean_step)
                continue

            clean_item = re.sub(r"^[\*\-•▪▫\+]\s*", "", line).strip()
            if clean_item.endswith(":") and not re.match(r"^[\d\u00BC-\u00BE\u2150-\u215E]", clean_item):
                continue
            if clean_item:
                name = clean_ingredient_name(clean_item)
                ingredients.append({"raw": clean_item, "name": name or clean_item})
            continue

        if current_section == "INSTRUCTIONS":
            clean_step = re.sub(r"^(?:step\s*\d+[:.]?\s*|\d+[\.\)\:]\s*)", "", line, flags=re.I).strip()
            clean_step = re.sub(r"^[\*\-•▪▫\+]\s*", "", clean_step).strip()
            if clean_step.endswith(":") and not any(ch.isdigit() for ch in clean_step) and len(clean_step) < 30:
                continue
            if clean_step:
                instructions.append(clean_step)
            continue

        if current_section == "OTHER":
            continue

    if not title:
        for l in lines:
            c = re.sub(r"^#{1,6}\s*", "", l).strip()
            if c and not INGREDIENTS_HEADER_RE.match(c) and not INSTRUCTIONS_HEADER_RE.match(c):
                title = c
                break

    if not title or not ingredients:
        raise ValueError("Could not parse recipe: title and at least one ingredient are required")

    return {
        "title": title,
        "sourceUrl": clean_source,
        "imageUrl": None,
        "servings": servings,
        "ingredients": ingredients,
        "instructions": instructions,
    }
