"""Receipt scanning routes."""

from __future__ import annotations

import re
import time

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool

from backend.auth_session import require_authenticated_user_id
from backend.models.responses import error_response, success_response
from backend.models.schemas import ReceiptScanRequest
from backend.services import ai_providers, receipt_ocr, subscription_service

router = APIRouter(prefix="/api/receipts", tags=["Receipts"])


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
        # PP-186: AI first (selected provider, then fallback) when the flag is on;
        # pytesseract is the final fallback and the only path when the flag is off.
        # Threadpool: provider calls are blocking HTTP with a timeout.
        result = await run_in_threadpool(ai_providers.scan_receipt_with_ai, body.image)
        engine = "ai"
        if result is None or not result["items"]:
            result = receipt_ocr.scan_receipt_image(body.image)
            engine = "pytesseract"
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
                "ocrEngine": engine,
                "processingTimeMs": duration_ms,
                "rawLength": len(result.get("rawText", "")),
            },
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("OCR_ERROR", "Receipt scan failed"),
        )