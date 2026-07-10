"""Receipt scan request validation tests."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from backend.models.schemas import MAX_RECEIPT_IMAGE_BYTES, ReceiptScanRequest


def test_receipt_scan_request_rejects_oversized_base64():
    # Base64 length that decodes to slightly more than 10MB
    oversized_len = (MAX_RECEIPT_IMAGE_BYTES * 4) // 3 + 4
    oversized_image = "A" * oversized_len

    with pytest.raises(ValidationError) as exc_info:
        ReceiptScanRequest(image=oversized_image)

    assert "10MB" in str(exc_info.value)