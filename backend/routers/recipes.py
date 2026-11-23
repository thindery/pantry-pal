"""Saved recipes API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from backend.auth_session import require_authenticated_user_id
from backend.lib.recipe_import import ContentTooLargeError, RecipeNotFoundError, SSRFError
from backend.models.responses import error_response, success_response
from backend.models.schemas import CreateRecipeRequest, ImportRecipeRequest
from backend.services import recipe_service, subscription_service

router = APIRouter(prefix="/api/recipes", tags=["Recipes"])


@router.get("")
async def list_recipes(user_id: str = Depends(require_authenticated_user_id)):
    """List all saved recipes for the authenticated user."""
    try:
        recipes = recipe_service.get_user_recipes(user_id)
        return success_response(recipes)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to retrieve recipes"),
        )


@router.get("/{recipe_id}")
async def get_recipe(recipe_id: str, user_id: str = Depends(require_authenticated_user_id)):
    """Get a single recipe by ID for the authenticated user."""
    recipe = recipe_service.get_recipe_by_id(user_id, recipe_id)
    if not recipe:
        raise HTTPException(
            status_code=404,
            detail=error_response("NOT_FOUND", f"Recipe with ID {recipe_id} not found"),
        )
    return success_response(recipe)


@router.post("", status_code=201)
async def create_recipe(body: CreateRecipeRequest, user_id: str = Depends(require_authenticated_user_id)):
    """Manually create and save a recipe."""
    try:
        payload = body.model_dump(by_alias=True)
        recipe = recipe_service.create_recipe(user_id, payload)
        return success_response(recipe)
    except ValueError as exc:
        if str(exc) == "TIER_LIMIT_EXCEEDED":
            raise HTTPException(
                status_code=403,
                detail=error_response(
                    "TIER_LIMIT_EXCEEDED",
                    "Free accounts can save 10 recipes. Upgrade to Pro for unlimited saved recipes.",
                    {"remaining": 0, "limit": subscription_service.FREE_MAX_SAVED_RECIPES},
                ),
            )
        raise HTTPException(
            status_code=400,
            detail=error_response("VALIDATION_ERROR", str(exc)),
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to create recipe"),
        )


@router.post("/import", status_code=201)
async def import_recipe(body: ImportRecipeRequest, user_id: str = Depends(require_authenticated_user_id)):
    """Import and save a recipe from a URL using Schema.org JSON-LD."""
    try:
        recipe = recipe_service.import_recipe_from_url(user_id, body.url)
        return success_response(recipe)
    except RecipeNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=error_response(
                "RECIPE_NOT_FOUND",
                "No recipe data was found on that page. You can enter the recipe by hand instead.",
            ),
        )
    except SSRFError:
        raise HTTPException(
            status_code=400,
            detail=error_response(
                "INVALID_URL",
                "This URL can't be imported. Use a public http or https recipe page, or enter the recipe by hand.",
            ),
        )
    except ContentTooLargeError:
        raise HTTPException(
            status_code=413,
            detail=error_response(
                "CONTENT_TOO_LARGE",
                "That page is too large to import. You can enter the recipe by hand instead.",
            ),
        )
    except ValueError as exc:
        if str(exc) == "TIER_LIMIT_EXCEEDED":
            raise HTTPException(
                status_code=403,
                detail=error_response(
                    "TIER_LIMIT_EXCEEDED",
                    "Free accounts can save 10 recipes. Upgrade to Pro for unlimited saved recipes.",
                    {"remaining": 0, "limit": subscription_service.FREE_MAX_SAVED_RECIPES},
                ),
            )
        raise HTTPException(
            status_code=400,
            detail=error_response("VALIDATION_ERROR", str(exc)),
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to import recipe"),
        )


@router.delete("/{recipe_id}")
async def delete_recipe(recipe_id: str, user_id: str = Depends(require_authenticated_user_id)):
    """Delete a recipe by ID for the authenticated user."""
    deleted = recipe_service.delete_recipe(user_id, recipe_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=error_response("NOT_FOUND", f"Recipe with ID {recipe_id} not found"),
        )
    return success_response({"deleted": True, "id": recipe_id})
