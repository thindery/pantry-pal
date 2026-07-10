"""Receipt scanning routes."""

from __future__ import annotations

import re
import time

from fastapi import APIRouter, Depends, HTTPException

from backend.clerk_auth import require_authenticated_user_id
from backend.models.responses import error_response, success_response
from backend.models.schemas import ReceiptScanRequest
from backend.services import receipt_ocr, subscription_service

router = APIRouter(prefix="/api/receipts", tags=["Receipts"])


@router.get("/health")
async def receipts_health():
    return success_response(
        {"status": "ok", "ocrEngine": "pytesseract", "supportedLanguages": ["eng"]}
    )


@router.post("/scan")
async def scan_receipt(body: ReceiptScanRequest, user_id: str = Depends(require_authenticated_user_id)):
    if not re.match(r"^[A-Za-z0-9+/]*={0,2}$", body.image):
        raise HTTPException(
            status_code=400,
            detail=error_response("VALIDATION_ERROR", "Invalid base64 image data"),
        )

    check = subscription_service.can_scan_receipt(user_id)
    if not check["allowed"]:
        raise HTTPException(
            status_code=403,
            detail=error_response("FORBIDDEN", "Receipt scan limit reached for this month"),
        )

    start = time.time()
    try:
        result = receipt_ocr.scan_receipt_image(body.image)
        subscription_service.increment_usage(user_id, "receiptScans")
        duration_ms = int((time.time() - start) * 1000)
        return success_response(
            {
                "items": result["items"],
                "store": result.get("store"),
                "total": result.get("total"),
                "confidence": result["confidence"],
            },
            {
                "ocrEngine": "pytesseract",
                "processingTimeMs": duration_ms,
                "rawLength": len(result.get("rawText", "")),
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=error_response("OCR_ERROR", str(exc)),
        )