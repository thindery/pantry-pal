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
    clean_ingredient_name,
    fetch_url_html,
    parse_recipe_json_ld,
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
    "createdAt": "2026-11-22T21:00:00Z",
}


def test_recipes_require_auth(client):
    assert client.get("/api/recipes").status_code == 401
    assert client.get("/api/recipes/some-id").status_code == 401
    assert client.post("/api/recipes", json={"title": "Test"}).status_code == 401
    assert client.post("/api/recipes/import", json={"url": "https://example.com"}).status_code == 401
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
def test_import_recipe_endpoint_not_found(mock_count, mock_can, mock_fetch, client, auth_headers):
    mock_fetch.return_value = (FIXTURES_DIR / "no_recipe.html").read_text()
    response = client.post(
        "/api/recipes/import",
        headers=auth_headers,
        json={"url": "https://example.com/recipe"},
    )
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "RECIPE_NOT_FOUND"


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
