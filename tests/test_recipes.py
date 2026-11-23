"""Tests for saved recipes API, tier limit, JSON-LD parsing, and SSRF protection."""

from __future__ import annotations

import io
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from backend.lib.recipe_import import (
    ContentTooLargeError,
    RecipeNotFoundError,
    SSRFError,
    SiteBlockedError,
    clean_ingredient_name,
    extract_og_title,
    fetch_url_html,
    parse_pasted_recipe,
    parse_recipe_json_ld,
    strip_tracking_params,
    title_from_source_url,
)
from backend.services.subscription_service import FREE_MAX_SAVED_RECIPES, can_save_recipe

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "recipes"

SAMPLE_RECIPE = {
    "id": "recipe-uuid-1",
    "userId": "test_user_contract_001",
    "title": "Classic Chocolate Chip Cookies",
    "sourceUrl": "https://example.com/cookies",
    "imageUrl": None,
    "servings": "24 cookies",
    "ingredients": [
        {"raw": "2 1/4 cups all-purpose flour", "name": "all-purpose flour"},
        {"raw": "1 tsp baking soda", "name": "baking soda"},
    ],
    "instructions": ["Preheat oven to 375 F.", "Combine flour and baking soda."],
    "isComplete": True,
    "createdAt": "2026-11-22T21:00:00Z",
}


def test_recipes_require_auth(client):
    assert client.get("/api/recipes").status_code == 401
    assert client.get("/api/recipes/some-id").status_code == 401
    assert client.post("/api/recipes", json={"title": "Test"}).status_code == 401
    assert client.post("/api/recipes/import", json={"url": "https://example.com"}).status_code == 401
    assert client.post("/api/recipes/parse", json={"text": "Title\nIngredients\n1 cup flour"}).status_code == 401
    assert client.patch("/api/recipes/some-id", json={"title": "Updated"}).status_code == 401
    assert client.delete("/api/recipes/some-id").status_code == 401


@patch("backend.routers.recipes.recipe_service.get_user_recipes", return_value=[SAMPLE_RECIPE])
def test_list_recipes(mock_list, client, auth_headers):
    response = client.get("/api/recipes", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 1
    assert data["data"][0]["title"] == "Classic Chocolate Chip Cookies"
    mock_list.assert_called_once_with("test_user_contract_001")


@patch("backend.routers.recipes.recipe_service.create_recipe", return_value=SAMPLE_RECIPE)
def test_create_recipe_manual(mock_create, client, auth_headers):
    payload = {
        "title": "Classic Chocolate Chip Cookies",
        "servings": "24 cookies",
        "ingredients": [
            {"raw": "2 1/4 cups all-purpose flour", "name": "all-purpose flour"},
            {"raw": "1 tsp baking soda", "name": "baking soda"},
        ],
        "instructions": ["Preheat oven to 375 F.", "Combine flour and baking soda."],
    }
    response = client.post("/api/recipes", headers=auth_headers, json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == SAMPLE_RECIPE["id"]
    mock_create.assert_called_once()


@patch(
    "backend.services.recipe_service.subscription_service.can_save_recipe",
    return_value={"allowed": False, "remaining": 0},
)
@patch("backend.services.recipe_service.count_user_recipes", return_value=10)
def test_create_recipe_tier_limit_enforced(mock_count, mock_check, client, auth_headers):
    response = client.post(
        "/api/recipes",
        headers=auth_headers,
        json={"title": "11th Recipe", "ingredients": ["1 cup rice"]},
    )
    assert response.status_code == 403
    data = response.json()
    assert data["error"]["code"] == "TIER_LIMIT_EXCEEDED"
    assert "Free accounts can save 10 recipes" in data["error"]["message"]
    mock_check.assert_called_once()


@patch("backend.services.recipe_service.fetch_url_html")
@patch(
    "backend.services.recipe_service.subscription_service.can_save_recipe",
    return_value={"allowed": False, "remaining": 0},
)
@patch("backend.services.recipe_service.count_user_recipes", return_value=10)
def test_import_recipe_tier_limit_does_not_fetch(mock_count, mock_check, mock_fetch, client, auth_headers):
    response = client.post(
        "/api/recipes/import",
        headers=auth_headers,
        json={"url": "https://example.com/recipe"},
    )
    assert response.status_code == 403
    data = response.json()
    assert data["error"]["code"] == "TIER_LIMIT_EXCEEDED"
    assert "Free accounts can save 10 recipes" in data["error"]["message"]
    mock_fetch.assert_not_called()


def test_subscription_service_can_save_recipe_helper():
    with patch(
        "backend.services.subscription_service.get_or_create_user_subscription",
        return_value={"tier": "free"},
    ):
        assert can_save_recipe("user-1", 9)["allowed"] is True
        assert can_save_recipe("user-1", 9)["remaining"] == 1
        assert can_save_recipe("user-1", 10)["allowed"] is False
        assert can_save_recipe("user-1", 10)["remaining"] == 0
        assert can_save_recipe("user-1", 11)["allowed"] is False

    with patch(
        "backend.services.subscription_service.get_or_create_user_subscription",
        return_value={"tier": "pro"},
    ):
        assert can_save_recipe("user-pro", 15)["allowed"] is True
        assert can_save_recipe("user-pro", 15)["remaining"] == -1

    assert FREE_MAX_SAVED_RECIPES == 10


@patch("backend.routers.recipes.recipe_service.get_recipe_by_id", return_value=None)
def test_get_recipe_not_found(mock_get, client, auth_headers):
    response = client.get("/api/recipes/nonexistent", headers=auth_headers)
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"


@patch("backend.routers.recipes.recipe_service.delete_recipe", return_value=True)
def test_delete_recipe(mock_delete, client, auth_headers):
    response = client.delete("/api/recipes/recipe-1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["deleted"] is True


def test_parse_recipe_json_ld_single_object():
    html_content = (FIXTURES_DIR / "single_recipe.html").read_text()
    recipe = parse_recipe_json_ld(html_content, source_url="https://example.com/single")
    assert recipe["title"] == "Classic Chocolate Chip Cookies"
    assert recipe["servings"] == "24 cookies"
    assert len(recipe["ingredients"]) == 7
    assert recipe["ingredients"][0]["name"] == "all-purpose flour"
    assert len(recipe["instructions"]) == 8


def test_parse_recipe_json_ld_graph():
    html_content = (FIXTURES_DIR / "graph_recipe.html").read_text()
    recipe = parse_recipe_json_ld(html_content, source_url="https://example.com/graph")
    assert recipe["title"] == "Garlic Butter Pasta"
    assert recipe["servings"] == "4 servings"
    assert len(recipe["ingredients"]) == 5
    assert len(recipe["instructions"]) == 3
    assert recipe["instructions"][0].startswith("Boil pasta")


def test_parse_recipe_json_ld_array():
    html_content = (FIXTURES_DIR / "array_recipe.html").read_text()
    recipe = parse_recipe_json_ld(html_content, source_url="https://example.com/array")
    assert recipe["title"] == "Tomato Basil Soup"
    assert recipe["servings"] == "4"
    assert len(recipe["ingredients"]) == 5
    assert len(recipe["instructions"]) == 3


def test_parse_recipe_json_ld_not_found():
    html_content = (FIXTURES_DIR / "no_recipe.html").read_text()
    with pytest.raises(RecipeNotFoundError):
        parse_recipe_json_ld(html_content, source_url="https://example.com/no-recipe")


@patch("backend.services.recipe_service.fetch_url_html")
@patch(
    "backend.services.recipe_service.subscription_service.can_save_recipe",
    return_value={"allowed": True, "remaining": 5},
)
@patch("backend.services.recipe_service.count_user_recipes", return_value=5)
@patch("backend.services.recipe_service.create_recipe", return_value=SAMPLE_RECIPE)
def test_import_recipe_endpoint_success(mock_create, mock_count, mock_can, mock_fetch, client, auth_headers):
    mock_fetch.return_value = (FIXTURES_DIR / "single_recipe.html").read_text()
    response = client.post(
        "/api/recipes/import",
        headers=auth_headers,
        json={"url": "https://example.com/recipe"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    mock_fetch.assert_called_once_with("https://example.com/recipe")


@patch("backend.services.recipe_service.fetch_url_html")
@patch(
    "backend.services.recipe_service.subscription_service.can_save_recipe",
    return_value={"allowed": True, "remaining": 5},
)
@patch("backend.services.recipe_service.count_user_recipes", return_value=5)
@patch("backend.services.recipe_service.create_recipe")
def test_import_recipe_endpoint_no_jsonld_saves_link_only(mock_create, mock_count, mock_can, mock_fetch, client, auth_headers):
    mock_fetch.return_value = (FIXTURES_DIR / "no_recipe.html").read_text()
    mock_create.return_value = {
        "id": "link-only-1",
        "userId": "test_user_contract_001",
        "title": "Saved recipe",
        "sourceUrl": "https://example.com/recipe",
        "imageUrl": None,
        "servings": None,
        "ingredients": [],
        "instructions": [],
        "isComplete": False,
        "createdAt": "2026-11-23T17:00:00Z",
    }
    response = client.post(
        "/api/recipes/import",
        headers=auth_headers,
        json={"url": "https://example.com/recipe"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["isComplete"] is False
    assert data["data"]["ingredients"] == []
    payload = mock_create.call_args[0][1]
    assert payload["isComplete"] is False
    assert payload["sourceUrl"] == "https://example.com/recipe"
    assert payload["ingredients"] == []
    assert "error" not in data


def test_ssrf_blocks_private_ips():
    blocked_urls = [
        "http://127.0.0.1/recipe",
        "http://10.0.0.1/recipe",
        "http://192.168.1.1/recipe",
        "http://172.16.0.1/recipe",
        "http://169.254.169.254/latest/meta-data/",
        "http://[::1]/recipe",
        "http://[::ffff:127.0.0.1]/recipe",
        "http://0.0.0.0/recipe",
        "http://0.1.2.3/recipe",
        "http://100.64.0.1/recipe",
    ]
    for url in blocked_urls:
        with pytest.raises(SSRFError):
            fetch_url_html(url)


def test_ssrf_blocks_invalid_schemes_and_credentials():
    invalid_urls = [
        "file:///etc/passwd",
        "ftp://example.com/recipe",
        "gopher://example.com/",
        "http://user:password@example.com/recipe",
        "javascript:alert(1)",
    ]
    for url in invalid_urls:
        with pytest.raises(SSRFError):
            fetch_url_html(url)


@patch("backend.lib.recipe_import.resolve_and_verify_hostname")
@patch("httpx.Client.send")
def test_ssrf_blocks_redirect_to_private(mock_send, mock_resolve):
    # Initial hop: host is example.com (allowed)
    # Redirects (302) to 127.0.0.1 (private)
    mock_resolve.side_effect = [
        ["93.184.216.34"],  # hop 1 ok
        SSRFError("Hostname resolved to blocked/private IP"),  # hop 2 blocked!
    ]

    mock_resp = MagicMock()
    mock_resp.status_code = 302
    mock_resp.headers = {"Location": "http://127.0.0.1/internal"}
    mock_send.return_value = mock_resp

    with pytest.raises(SSRFError):
        fetch_url_html("http://example.com/recipe")


@patch("backend.lib.recipe_import.resolve_and_verify_hostname", return_value=["93.184.216.34"])
@patch("httpx.Client.send")
def test_ssrf_aborts_on_oversized_response(mock_send, mock_resolve):
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.encoding = "utf-8"
    # Stream chunks totaling > 1MB
    mock_resp.iter_bytes.return_value = [b"a" * 1024 * 600, b"b" * 1024 * 600]
    mock_send.return_value = mock_resp

    with pytest.raises(ContentTooLargeError):
        fetch_url_html("http://example.com/big-recipe")



def test_clean_ingredient_name():
    assert clean_ingredient_name("2 cups all-purpose flour") == "all-purpose flour"
    assert clean_ingredient_name("1 1/2 tbsp olive oil") == "olive oil"
    assert clean_ingredient_name("1/2 tsp salt") == "salt"
    assert clean_ingredient_name("black pepper") == "black pepper"
    assert clean_ingredient_name("1 bell pepper") == "bell pepper"
    assert clean_ingredient_name("salt and pepper to taste") == "salt and pepper to taste"
    assert clean_ingredient_name("4 cloves garlic, minced") == "garlic, minced"
    assert clean_ingredient_name("1 can whole peeled tomatoes") == "whole peeled tomatoes"
    assert clean_ingredient_name("1 (18.25 ounce) package yellow cake mix") == "yellow cake mix"
    assert clean_ingredient_name("1 (8 ounce) package cream cheese, softened") == "cream cheese, softened"


def test_strip_tracking_params():
    tylor_url = (
        "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/"
        "?utm_source=facebook.com&utm_medium=social&utm_content=fbreel"
        "&utm_campaign=allrecipes&fbclid=IwAR0123456789abcdef"
    )
    cleaned = strip_tracking_params(tylor_url)
    assert cleaned == "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/"

    all_tracking_params = (
        "https://example.com/recipe?"
        "utm_campaign=summer&utm_source=fb&utm_medium=post&"
        "fbclid=123&gclid=456&gclsrc=789&dclid=101&gbraid=112&wbraid=131&"
        "msclkid=415&twclid=161&ttclid=718&li_fat_id=192&mc_eid=021&mc_cid=223&"
        "igshid=242&yclid=526&_hsenc=272&_hsmi=829&mkt_tok=303&srsltid=313&"
        "ncid=323&ocid=333&icid=343&pk_campaign=353&pk_kwd=363&"
        "mtm_source=373&hsa_cam=383&keep_me=true&id=99"
    )
    cleaned_all = strip_tracking_params(all_tracking_params)
    assert cleaned_all == "https://example.com/recipe?keep_me=true&id=99"

    assert strip_tracking_params(None) is None
    assert strip_tracking_params("") == ""
    assert strip_tracking_params("https://example.com/no-params") == "https://example.com/no-params"


def test_parse_pasted_recipe_allrecipes_fixture():
    fixture_path = FIXTURES_DIR / "neiman_marcus_cake.txt"
    text = fixture_path.read_text()
    source_url = "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/?utm_source=fb&fbclid=abc"
    recipe = parse_pasted_recipe(text, source_url=source_url)

    assert recipe["title"] == "Neiman Marcus Cake II"
    assert recipe["sourceUrl"] == "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/"
    assert recipe["servings"] == "12"
    assert len(recipe["ingredients"]) == 6

    ing_names = [i["name"] for i in recipe["ingredients"]]
    assert "yellow cake mix" in ing_names
    assert "butter, melted" in ing_names
    assert "cream cheese, softened" in ing_names
    assert "confectioners' sugar" in ing_names
    assert "vanilla extract" in ing_names

    assert len(recipe["instructions"]) == 4
    assert recipe["instructions"][0].startswith("Preheat oven to 350 degrees F")
    assert recipe["instructions"][3].startswith("Bake in the preheated oven")


def test_parse_pasted_recipe_missing_headings():
    raw_text = """
    Grandma's Cinnamon Toast

    Yield: 2 servings

    * 2 slices white bread
    * 2 tbsp butter, softened
    * 1 tsp ground cinnamon
    * 1 tbsp sugar

    1. Toast the bread in a toaster.
    2. Spread with butter and sprinkle with cinnamon sugar.
    """
    recipe = parse_pasted_recipe(raw_text)
    assert recipe["title"] == "Grandma's Cinnamon Toast"
    assert recipe["servings"] == "2 servings"
    assert len(recipe["ingredients"]) == 4
    assert len(recipe["instructions"]) == 2
    assert "bread" in recipe["ingredients"][0]["name"]


def test_parse_pasted_recipe_bare_json_ld():
    bare_json = """
    {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": "Quick Avocado Toast",
        "recipeYield": "1 serving",
        "recipeIngredient": [
            "1 slice sourdough bread",
            "1/2 ripe avocado",
            "1 pinch red pepper flakes"
        ],
        "recipeInstructions": [
            "Toast bread until golden.",
            "Mash avocado and spread onto toast.",
            "Top with red pepper flakes."
        ]
    }
    """
    recipe = parse_pasted_recipe(bare_json, source_url="https://example.com/toast")
    assert recipe["title"] == "Quick Avocado Toast"
    assert recipe["servings"] == "1 serving"
    assert len(recipe["ingredients"]) == 3
    assert len(recipe["instructions"]) == 3
    assert recipe["sourceUrl"] == "https://example.com/toast"


def test_parse_pasted_recipe_html_with_json_ld():
    html_content = (FIXTURES_DIR / "single_recipe.html").read_text()
    recipe = parse_pasted_recipe(html_content, source_url="https://example.com/single?utm_medium=email")
    assert recipe["title"] == "Classic Chocolate Chip Cookies"
    assert recipe["sourceUrl"] == "https://example.com/single"
    assert len(recipe["ingredients"]) == 7


def test_parse_pasted_recipe_validation_errors():
    with pytest.raises(ValueError, match="cannot be empty|empty"):
        parse_pasted_recipe("")

    with pytest.raises(ValueError, match="title and at least one ingredient are required"):
        parse_pasted_recipe("Just a random title with no ingredients or steps at all.")


@patch("backend.lib.recipe_import.resolve_and_verify_hostname", return_value=["93.184.216.34"])
@patch("httpx.Client.send")
def test_fetch_url_html_blocked_statuses(mock_send, mock_resolve):
    for status in (401, 403, 429):
        mock_resp = MagicMock()
        mock_resp.status_code = status
        mock_send.return_value = mock_resp

        with pytest.raises(SiteBlockedError, match=f"status {status}"):
            fetch_url_html("https://example.com/recipe")


@patch("backend.lib.recipe_import.resolve_and_verify_hostname", return_value=["93.184.216.34"])
@patch("httpx.Client.send")
def test_fetch_url_html_bot_challenge_body(mock_send, mock_resolve):
    challenge_bodies = [
        b"<html><head><title>Just a moment...</title></head><body>DDoS protection</body></html>",
        b"<html><head><title>Attention Required! | Cloudflare</title></head></html>",
        b"<html><head><title>Access Denied</title></head><body>You do not have permission to access. Reference #18.123</body></html>",
        b"<div>Please verify you are a human to continue</div>",
    ]
    for body in challenge_bodies:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.encoding = "utf-8"
        mock_resp.iter_bytes.return_value = [body]
        mock_send.return_value = mock_resp

        with pytest.raises(SiteBlockedError, match="challenge|access denied"):
            fetch_url_html("https://example.com/recipe")


LINK_ONLY_CAKE = {
    "id": "link-only-cake",
    "userId": "test_user_contract_001",
    "title": "Neiman Marcus Cake II",
    "sourceUrl": "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/",
    "imageUrl": None,
    "servings": None,
    "ingredients": [],
    "instructions": [],
    "isComplete": False,
    "createdAt": "2026-11-23T17:00:00Z",
}


@patch("backend.services.recipe_service.fetch_url_html")
@patch(
    "backend.services.recipe_service.subscription_service.can_save_recipe",
    return_value={"allowed": True, "remaining": 5},
)
@patch("backend.services.recipe_service.count_user_recipes", return_value=5)
@patch("backend.services.recipe_service.create_recipe", return_value=LINK_ONLY_CAKE)
def test_import_recipe_endpoint_blocked_saves_link_only(mock_create, mock_count, mock_can, mock_fetch, client, auth_headers):
    mock_fetch.side_effect = SiteBlockedError("Site blocked automated request (status 403)")
    response = client.post(
        "/api/recipes/import",
        headers=auth_headers,
        json={
            "url": "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/?utm_source=facebook.com&fbclid=Iw123"
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["isComplete"] is False
    assert data["data"]["title"] == "Neiman Marcus Cake II"
    assert data["data"]["sourceUrl"] == "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/"
    assert "error" not in data
    payload = mock_create.call_args[0][1]
    assert payload["isComplete"] is False
    assert payload["title"] == "Neiman Marcus Cake II"
    assert payload["sourceUrl"] == "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/"
    assert payload["ingredients"] == []


@patch("backend.services.recipe_service.fetch_url_html")
@patch(
    "backend.services.recipe_service.subscription_service.can_save_recipe",
    return_value={"allowed": True, "remaining": 5},
)
@patch("backend.services.recipe_service.count_user_recipes", return_value=5)
@patch("backend.services.recipe_service.create_recipe", return_value=SAMPLE_RECIPE)
def test_import_recipe_endpoint_strips_tracking_params(mock_create, mock_count, mock_can, mock_fetch, client, auth_headers):
    mock_fetch.return_value = (FIXTURES_DIR / "single_recipe.html").read_text()
    url_with_tracking = "https://example.com/recipe?utm_source=fb&fbclid=12345"
    response = client.post(
        "/api/recipes/import",
        headers=auth_headers,
        json={"url": url_with_tracking},
    )
    assert response.status_code == 201
    mock_fetch.assert_called_once_with("https://example.com/recipe")
    # Verify create_recipe was called with stripped sourceUrl
    created_call_args = mock_create.call_args[0][1]
    assert created_call_args["sourceUrl"] == "https://example.com/recipe"


def test_parse_recipe_endpoint_requires_auth(client):
    res = client.post("/api/recipes/parse", json={"text": "Recipe Title\nIngredients\n1 cup flour"})
    assert res.status_code == 401


@patch("backend.services.recipe_service.create_recipe")
@patch("backend.services.recipe_service.subscription_service.can_save_recipe")
def test_parse_recipe_endpoint_success_and_strips_source_url(mock_can_save, mock_create, client, auth_headers):
    fixture_text = (FIXTURES_DIR / "neiman_marcus_cake.txt").read_text()
    url_with_tracking = "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/?utm_source=facebook&fbclid=abc123"

    response = client.post(
        "/api/recipes/parse",
        headers=auth_headers,
        json={"text": fixture_text, "sourceUrl": url_with_tracking},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    draft = data["data"]
    assert draft["title"] == "Neiman Marcus Cake II"
    assert draft["sourceUrl"] == "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/"
    assert draft["servings"] == "12"
    assert len(draft["ingredients"]) == 6
    assert len(draft["instructions"]) == 4

    # Crucial: verify endpoint did not create a recipe or check tier limits
    mock_create.assert_not_called()
    mock_can_save.assert_not_called()


def test_parse_recipe_endpoint_validation_errors(client, auth_headers):
    # Empty text
    res1 = client.post("/api/recipes/parse", headers=auth_headers, json={"text": "   "})
    assert res1.status_code == 422 or res1.status_code == 400

    # Text lacking ingredients
    res2 = client.post("/api/recipes/parse", headers=auth_headers, json={"text": "Just a lone title"})
    assert res2.status_code == 400
    assert res2.json()["error"]["code"] == "VALIDATION_ERROR"


def test_title_from_source_url():
    assert (
        title_from_source_url(
            "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/?utm_source=facebook.com&fbclid=Iw123"
        )
        == "Neiman Marcus Cake II"
    )
    assert title_from_source_url("https://www.simplyrecipes.com/recipes/banana-bread/") == "Banana Bread"
    assert title_from_source_url("https://example.com/recipe/7869/neiman-marcus-cake-ii-12345") == "Neiman Marcus Cake II"
    assert title_from_source_url("https://example.com/") == "Saved recipe"
    assert title_from_source_url(None) == "Saved recipe"


def test_extract_og_title():
    html = """
    <html><head>
      <meta property="og:title" content="Neiman Marcus Cake II" />
      <title>Allrecipes | Neiman Marcus Cake II</title>
    </head></html>
    """
    assert extract_og_title(html) == "Neiman Marcus Cake II"
    assert extract_og_title("<html><head><title>Just a moment...</title></head></html>") is None
    assert extract_og_title("") is None


@patch("backend.services.recipe_service.fetch_url_html")
@patch(
    "backend.services.recipe_service.subscription_service.can_save_recipe",
    return_value={"allowed": True, "remaining": 5},
)
@patch("backend.services.recipe_service.count_user_recipes", return_value=5)
@patch("backend.services.recipe_service.create_recipe")
def test_import_recipe_uses_og_title_when_no_jsonld(mock_create, mock_count, mock_can, mock_fetch, client, auth_headers):
    mock_fetch.return_value = """
    <html><head><meta property="og:title" content="Grandma&#x27;s Banana Bread" /></head>
    <body><p>No recipe metadata here.</p></body></html>
    """
    mock_create.return_value = {
        "id": "link-og",
        "userId": "test_user_contract_001",
        "title": "Grandma's Banana Bread",
        "sourceUrl": "https://example.com/banana-bread-999",
        "imageUrl": None,
        "servings": None,
        "ingredients": [],
        "instructions": [],
        "isComplete": False,
        "createdAt": "2026-11-23T17:00:00Z",
    }
    response = client.post(
        "/api/recipes/import",
        headers=auth_headers,
        json={"url": "https://example.com/banana-bread-999"},
    )
    assert response.status_code == 201
    payload = mock_create.call_args[0][1]
    assert payload["title"] == "Grandma's Banana Bread"
    assert payload["isComplete"] is False


@patch("backend.routers.recipes.recipe_service.update_recipe")
def test_update_recipe_endpoint(mock_update, client, auth_headers):
    mock_update.return_value = {
        **SAMPLE_RECIPE,
        "title": "Neiman Marcus Cake II",
        "isComplete": True,
    }
    response = client.patch(
        "/api/recipes/recipe-uuid-1",
        headers=auth_headers,
        json={
            "title": "Neiman Marcus Cake II",
            "ingredients": ["1 package yellow cake mix"],
            "instructions": ["Mix and bake."],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["isComplete"] is True
    mock_update.assert_called_once()


@patch("backend.routers.recipes.recipe_service.update_recipe", return_value=None)
def test_update_recipe_not_found(mock_update, client, auth_headers):
    response = client.patch(
        "/api/recipes/missing",
        headers=auth_headers,
        json={"title": "Nope"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
