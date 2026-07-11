"""Receipt scan parsing and visual usage detection routes."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from backend.auth_session import require_authenticated_user_id
from backend.models.responses import error_response, success_response
from backend.models.schemas import ScanReceiptRequest, VisualUsageRequest
from backend.services import scan_service

router = APIRouter(prefix="/api", tags=["Scan"])


@router.post("/scan-receipt")
async def scan_receipt(
    body: ScanReceiptRequest,
    user_id: str = Depends(require_authenticated_user_id),
):
    del user_id
    try:
        scan_data = (
            [item.model_dump() for item in body.scanData]
            if isinstance(body.scanData, list)
            else body.scanData
        )
        results = scan_service.process_receipt_scan(scan_data)
        return success_response(
            results,
            {
                "itemCount": len(results),
                "processedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            },
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to process receipt scan"),
        )


@router.post("/visual-usage")
async def visual_usage(
    body: VisualUsageRequest,
    user_id: str = Depends(require_authenticated_user_id),
):
    detections = [detection.model_dump() for detection in body.detections]
    source = body.detectionSource or "VISUAL_USAGE"

    try:
        results = scan_service.process_visual_usage(user_id, detections, source)
        return success_response(
            {
                "processed": results["processed"],
                "activities": results["activities"],
                "errors": results["errors"],
            },
            {
                "totalDetections": len(detections),
                "successful": len(results["processed"]),
                "failed": len(results["errors"]),
                "processedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            },
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to process visual usage detection"),
        )


@router.get("/visual-usage/supported-items")
async def visual_usage_supported_items(user_id: str = Depends(require_authenticated_user_id)):
    del user_id
    supported_items = scan_service.get_supported_items()
    return success_response(
        supported_items,
        {
            "totalSupported": len(supported_items),
            "modelVersion": "v1.0.0",
        },
    )