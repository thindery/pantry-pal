"""Saved recipes API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from backend.auth_session import require_authenticated_user_id
from backend.lib.recipe_import import SSRFError
from backend.models.responses import error_response, success_response
from backend.models.schemas import CreateRecipeRequest, ImportRecipeRequest, ParseRecipeRequest, UpdateRecipeRequest
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


@router.post("/parse")
async def parse_recipe(body: ParseRecipeRequest, user_id: str = Depends(require_authenticated_user_id)):
    """Parse recipe text or HTML without saving or counting against tier limits."""
    try:
        draft = recipe_service.parse_pasted_recipe(body.text, source_url=body.sourceUrl)
        return success_response(draft)
    except SSRFError:
        raise HTTPException(
            status_code=400,
            detail=error_response(
                "INVALID_URL",
                "The provided source URL is invalid or not allowed.",
            ),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=error_response("VALIDATION_ERROR", str(exc)),
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to parse recipe text"),
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
    """Import a recipe from a URL. If the site blocks us or has no JSON-LD, save a link-only recipe."""
    try:
        recipe = recipe_service.import_recipe_from_url(user_id, body.url)
        return success_response(recipe)
    except SSRFError:
        raise HTTPException(
            status_code=400,
            detail=error_response(
                "INVALID_URL",
                "This URL can't be imported. Use a public http or https recipe page, or enter the recipe by hand.",
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


@router.patch("/{recipe_id}")
async def update_recipe(recipe_id: str, body: UpdateRecipeRequest, user_id: str = Depends(require_authenticated_user_id)):
    """Update a saved recipe (used to add details to a link-only import)."""
    try:
        payload = body.model_dump(by_alias=False, exclude_unset=True)
        recipe = recipe_service.update_recipe(user_id, recipe_id, payload)
        if not recipe:
            raise HTTPException(
                status_code=404,
                detail=error_response("NOT_FOUND", f"Recipe with ID {recipe_id} not found"),
            )
        return success_response(recipe)
    except HTTPException:
        raise
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
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to update recipe"),
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
