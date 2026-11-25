"""Pydantic v2 models matching Express Zod schemas."""

from __future__ import annotations

import re
from enum import Enum
from typing import Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator

UUID_REGEX = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.I,
)

MAX_ITEM_NAME_LENGTH = 100
MAX_UNIT_LENGTH = 20
MAX_CATEGORY_LENGTH = 50
MAX_RECEIPT_IMAGE_BYTES = 10 * 1024 * 1024  # 10MB decoded image


class ActivityType(str, Enum):
    ADD = "ADD"
    REMOVE = "REMOVE"
    ADJUST = "ADJUST"
    SHOPPING_SESSION = "SHOPPING_SESSION"
    DELETE = "DELETE"


class ActivitySource(str, Enum):
    MANUAL = "MANUAL"
    RECEIPT_SCAN = "RECEIPT_SCAN"
    VISUAL_USAGE = "VISUAL_USAGE"
    BARCODE_SCAN = "BARCODE_SCAN"
    SHOPPING_SESSION = "SHOPPING_SESSION"


class PantryItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    userId: str
    name: str
    quantity: float
    unit: str
    category: str
    lastUpdated: str
    barcode: Optional[str] = None
    targetQuantity: Optional[float] = None
    groupId: Optional[str] = None


class Activity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    userId: str
    itemId: Optional[str] = None
    itemName: str
    type: ActivityType
    amount: float
    timestamp: str
    source: ActivitySource
    metadata: Optional[str] = None
    itemBarcode: Optional[str] = None


class CreateActivityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    itemId: str
    type: Literal["ADD", "REMOVE", "ADJUST"]
    amount: float = Field(..., gt=0, le=999999)
    source: ActivitySource = ActivitySource.MANUAL
    adjustQuantity: bool = True

    @field_validator("itemId")
    @classmethod
    def validate_uuid(cls, v: str) -> str:
        if not UUID_REGEX.match(v):
            raise ValueError("Invalid item ID format")
        return v


class CreateItemRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=MAX_ITEM_NAME_LENGTH)
    quantity: float = Field(..., ge=0, le=999999)
    unit: str = Field(..., min_length=1, max_length=MAX_UNIT_LENGTH)
    category: str = Field(..., min_length=1, max_length=MAX_CATEGORY_LENGTH)
    barcode: Optional[str] = Field(default=None, max_length=50)
    targetQuantity: Optional[float] = Field(default=None, ge=0, le=999999)

    @field_validator("name", "unit", "category")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class UpdateItemRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(default=None, min_length=1, max_length=MAX_ITEM_NAME_LENGTH)
    quantity: Optional[float] = Field(default=None, ge=0, le=999999)
    unit: Optional[str] = Field(default=None, min_length=1, max_length=MAX_UNIT_LENGTH)
    category: Optional[str] = Field(default=None, min_length=1, max_length=MAX_CATEGORY_LENGTH)
    barcode: Optional[str] = Field(default=None, max_length=50)
    targetQuantity: Optional[float] = Field(default=None, ge=0, le=999999)

    @field_validator("name", "unit", "category")
    @classmethod
    def strip_optional(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v is not None else v


class ReceiptScanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image: str = Field(..., min_length=1)

    @field_validator("image")
    @classmethod
    def validate_image_size(cls, v: str) -> str:
        padding = v.count("=")
        decoded_size = (len(v) * 3) // 4 - padding
        if decoded_size > MAX_RECEIPT_IMAGE_BYTES:
            raise ValueError("Image exceeds maximum size of 10MB")
        return v


class CheckoutConfirmRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sessionId: str = Field(..., min_length=11, max_length=255, pattern=r"^cs_[A-Za-z0-9_]+$")


class CheckoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tier: Literal["pro", "family"]
    billingInterval: Literal["month", "year"]
    successUrl: str
    cancelUrl: str


class PortalRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    returnUrl: str


class CreateSessionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    storeName: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=500)


class AddSessionItemRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    barcode: Optional[str] = Field(default=None, max_length=50)
    name: str = Field(..., min_length=1, max_length=MAX_ITEM_NAME_LENGTH)
    quantity: float = Field(default=1, gt=0, le=999999)
    unit: Optional[str] = Field(default=None, max_length=MAX_UNIT_LENGTH)
    price: Optional[float] = Field(default=None, ge=0, le=999999.99)
    category: Optional[str] = Field(default=None, max_length=MAX_CATEGORY_LENGTH)


class CompleteSessionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    receiptUrl: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("receiptUrl")
    @classmethod
    def validate_receipt_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        from backend.lib.url_validation import validate_receipt_url

        return validate_receipt_url(v)


class UpdateSessionReceiptRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    receiptUrl: str = Field(..., max_length=500)

    @field_validator("receiptUrl")
    @classmethod
    def validate_receipt_url(cls, v: str) -> str:
        from backend.lib.url_validation import validate_receipt_url

        return validate_receipt_url(v)


class ScanResultItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=MAX_ITEM_NAME_LENGTH)
    quantity: float = Field(..., ge=0)
    unit: Optional[str] = Field(default=None, max_length=MAX_UNIT_LENGTH)
    category: Optional[str] = Field(default=None, max_length=MAX_CATEGORY_LENGTH)


class ScanReceiptRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scanData: Union[str, list[ScanResultItem]]
    minConfidence: Optional[float] = Field(default=None, ge=0, le=1)


class UsageDetection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=MAX_ITEM_NAME_LENGTH)
    quantityUsed: float = Field(..., gt=0)


class VisualUsageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    detections: list[UsageDetection] = Field(..., min_length=1)
    detectionSource: Optional[str] = Field(default=None, max_length=100)


class ClientErrorCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=2000)
    stack: Optional[str] = Field(default=None, max_length=8000)
    component: Optional[str] = Field(default=None, max_length=500)
    url: Optional[str] = Field(default=None, max_length=2000)
    userAgent: Optional[str] = Field(default=None, max_length=500)


class BarcodeSaveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=MAX_ITEM_NAME_LENGTH)
    quantity: float = Field(default=1, gt=0, le=999999)
    unit: str = Field(default="pieces", min_length=1, max_length=MAX_UNIT_LENGTH)
    category: str = Field(..., min_length=1, max_length=MAX_CATEGORY_LENGTH)
    brand: Optional[str] = Field(default=None, max_length=200)
    imageUrl: Optional[str] = Field(default=None, max_length=2000)
    ingredients: Optional[str] = Field(default=None, max_length=8000)
    nutrition: Optional[dict[str, float]] = None

    @field_validator("name", "unit", "category")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class RecipeIngredientItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    raw: str = Field(..., min_length=1, max_length=1000)
    name: str = Field(..., min_length=1, max_length=200)


class CreateRecipeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    title: str = Field(..., min_length=1, max_length=200)
    sourceUrl: Optional[str] = Field(default=None, max_length=2000, alias="source_url")
    imageUrl: Optional[str] = Field(default=None, max_length=2000, alias="image_url")
    servings: Optional[str] = Field(default=None, max_length=100)
    ingredients: list[Union[RecipeIngredientItem, str]] = Field(default_factory=list)
    instructions: list[str] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: str) -> str:
        return v.strip()


class ImportRecipeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: str = Field(..., min_length=1, max_length=2000)

    @field_validator("url")
    @classmethod
    def strip_url(cls, v: str) -> str:
        return v.strip()


class ParseRecipeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    text: str = Field(..., min_length=1, max_length=100000)
    sourceUrl: Optional[str] = Field(default=None, max_length=2000, alias="source_url")

    @field_validator("text")
    @classmethod
    def strip_text(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Recipe text cannot be empty")
        return s


class UpdateRecipeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    sourceUrl: Optional[str] = Field(default=None, max_length=2000, alias="source_url")
    servings: Optional[str] = Field(default=None, max_length=100)
    ingredients: Optional[list[Union[RecipeIngredientItem, str]]] = None
    instructions: Optional[list[str]] = None

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        s = v.strip()
        if not s:
            raise ValueError("Title is required")
        return s


class CreateItemGroupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=100)
    itemIds: list[str] = Field(..., min_length=1, max_length=50)
    targetQuantity: Optional[float] = Field(default=None, ge=0, le=999999)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Name is required")
        return s


class UpdateItemGroupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    targetQuantity: Optional[float] = Field(default=None, ge=0, le=999999)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        s = v.strip()
        if not s:
            raise ValueError("Name cannot be blank")
        return s


class AddItemGroupItemRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    itemId: str



class InstacartListItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(..., min_length=1, max_length=200)
    quantity: float = Field(default=1, gt=0, le=999)
    unit: Optional[str] = Field(default=None, max_length=32)
    upc: Optional[str] = Field(default=None, max_length=32)


class InstacartHandoffRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[InstacartListItem] = Field(..., min_length=1, max_length=100)
