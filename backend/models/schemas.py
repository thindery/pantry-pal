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


class ActivityType(str, Enum):
    ADD = "ADD"
    REMOVE = "REMOVE"
    ADJUST = "ADJUST"
    SHOPPING_SESSION = "SHOPPING_SESSION"


class ActivitySource(str, Enum):
    MANUAL = "MANUAL"
    RECEIPT_SCAN = "RECEIPT_SCAN"
    VISUAL_USAGE = "VISUAL_USAGE"
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


class Activity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    userId: str
    itemId: str
    itemName: str
    type: ActivityType
    amount: float
    timestamp: str
    source: ActivitySource
    metadata: Optional[str] = None


class CreateItemRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=MAX_ITEM_NAME_LENGTH)
    quantity: float = Field(..., ge=0, le=999999)
    unit: str = Field(..., min_length=1, max_length=MAX_UNIT_LENGTH)
    category: str = Field(..., min_length=1, max_length=MAX_CATEGORY_LENGTH)
    barcode: Optional[str] = Field(default=None, max_length=50)

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

    @field_validator("name", "unit", "category")
    @classmethod
    def strip_optional(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v is not None else v


class CreateActivityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    itemId: str
    type: Literal["ADD", "REMOVE", "ADJUST"]
    amount: float = Field(..., gt=0, le=999999)
    source: ActivitySource = ActivitySource.MANUAL

    @field_validator("itemId")
    @classmethod
    def validate_uuid(cls, v: str) -> str:
        if not UUID_REGEX.match(v):
            raise ValueError("Invalid item ID format")
        return v


class ReceiptScanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image: str = Field(..., min_length=1)


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


class UpdateSessionReceiptRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    receiptUrl: str = Field(..., max_length=500)


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
    model_config = ConfigDict(extra="allow")

    type: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    stack: Optional[str] = None
    component: Optional[str] = None
    url: Optional[str] = None
    userAgent: Optional[str] = None
    userId: Optional[str] = None


class BarcodeSaveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    quantity: float = 1
    unit: str = "pieces"
    category: str
    brand: Optional[str] = None
    imageUrl: Optional[str] = None