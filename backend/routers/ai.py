"""PP-183: Pro AI recipe builder endpoints. All calls pass backend.services.ai_guard first."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

from backend.auth_session import require_authenticated_user_id, resolve_authenticated_user
from backend.clerk_auth import is_admin_user
from backend.models.responses import error_response, success_response
from backend.services import ai_guard, ai_recipe_builder, subscription_service
from backend.services.ai_guard import GuardBlocked

router = APIRouter(prefix="/api/ai", tags=["AI"])


class RecipeBuilderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    servings: int = Field(default=2, ge=1, le=12)
    diet: str = Field(default="none", max_length=20)
    maxMinutes: Optional[int] = Field(default=None, ge=10, le=240)
    mustUse: list[str] = Field(default_factory=list, max_length=5)
    note: str = Field(default="", max_length=120)
    excludeTitles: list[str] = Field(
        default_factory=list,
        max_length=ai_recipe_builder.MAX_EXCLUDE_TITLES,
        validation_alias=AliasChoices("excludeTitles", "exclude_titles"),
    )
    regenerate: bool = False

    @field_validator("diet")
    @classmethod
    def known_diet(cls, v: str) -> str:
        v = (v or "none").strip().lower()
        if v not in ai_recipe_builder.DIETS:
            raise ValueError("Unknown diet")
        return v

    @field_validator("mustUse")
    @classmethod
    def clean_must_use(cls, v: list[str]) -> list[str]:
        out: list[str] = []
        for item in v:
            name = ai_recipe_builder._clean(item, 60)
            if name and name.lower() not in {o.lower() for o in out}:
                out.append(name)
        return out

    @field_validator("note")
    @classmethod
    def clean_note(cls, v: str) -> str:
        return ai_recipe_builder._clean(v, 120)

    @field_validator("excludeTitles")
    @classmethod
    def clean_exclude(cls, v: list[str]) -> list[str]:
        return ai_recipe_builder.clean_exclude_titles(v)


def _tier(user_id: str) -> str:
    return subscription_service.get_or_create_user_subscription(user_id)["tier"]


def _blocked(exc: GuardBlocked) -> HTTPException:
    return HTTPException(status_code=exc.status, detail=error_response(exc.code, exc.message, exc.details or None))


@router.get("/recipes/status")
async def recipe_builder_status(user_id: str = Depends(require_authenticated_user_id)):
    if not ai_guard.features_enabled():
        return success_response({"enabled": False})
    try:
        tier = _tier(user_id)
    except Exception:
        return success_response({"enabled": False})
    return success_response(await run_in_threadpool(ai_recipe_builder.status, user_id, tier))


@router.post("/recipes/suggest")
async def suggest_recipes(body: RecipeBuilderRequest, user_id: str = Depends(require_authenticated_user_id)):
    if not ai_guard.features_enabled():
        raise HTTPException(status_code=404, detail=error_response("AI_DISABLED", ai_guard.MSG_UNAVAILABLE))
    try:
        tier = _tier(user_id)
    except Exception:
        raise HTTPException(status_code=503, detail=error_response("AI_UNAVAILABLE", ai_guard.MSG_UNAVAILABLE))
    try:
        result = await run_in_threadpool(ai_recipe_builder.build_recipes, user_id, tier, body.model_dump())
    except GuardBlocked as exc:
        raise _blocked(exc)
    return success_response(result)


async def _require_admin(request: Request) -> str:
    user_id, email = await resolve_authenticated_user(request)
    if not user_id:
        raise HTTPException(status_code=401, detail=error_response("UNAUTHORIZED", "Authentication required"))
    if not is_admin_user(user_id, email):
        raise HTTPException(status_code=403, detail=error_response("FORBIDDEN", "Admin access required"))
    return user_id


@router.get("/admin/usage")
async def admin_usage(_admin: str = Depends(_require_admin)):
    try:
        return success_response(await run_in_threadpool(ai_guard.admin_summary))
    except Exception:
        raise HTTPException(status_code=500, detail=error_response("INTERNAL_ERROR", "Failed to read AI usage"))


@router.post("/admin/resume")
async def admin_resume(_admin: str = Depends(_require_admin)):
    """Clear the auto-trip pause. The caps still apply on the next call."""
    await run_in_threadpool(ai_guard.clear_pause)
    return success_response({"pausedUntil": None})
