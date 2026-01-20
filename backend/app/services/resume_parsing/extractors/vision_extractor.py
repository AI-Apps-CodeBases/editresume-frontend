"""Convert PDF pages to images for vision-based extraction."""

from __future__ import annotations

import base64
import logging
from io import BytesIO
from typing import Any

logger = logging.getLogger(__name__)


def extract_with_vision(file_bytes: bytes) -> list[dict[str, Any]]:
    """
    Convert PDF pages to images for vision-based parsing.
    
    Returns:
        [
            {
                'page_num': int,
                'image_base64': str,
                'width': int,
                'height': int
            }
        ]
    """
    try:
        from pdf2image import convert_from_bytes
        from PIL import Image
    except ImportError as e:
        logger.error(f"Vision extraction dependencies not installed: {e}")
        logger.error("Please install: pip install pdf2image Pillow")
        logger.error("On Linux, you may also need: sudo apt-get install poppler-utils")
        raise ImportError(
            "pdf2image and Pillow are required for vision extraction. "
            "Install with: pip install pdf2image Pillow"
        )

    try:
        images = convert_from_bytes(
            file_bytes,
            dpi=200,  # Good balance between quality and size
            fmt='PNG',
        )

        pages_data = []
        for page_num, image in enumerate(images, 1):
            # Convert PIL Image to base64
            buffered = BytesIO()
            image.save(buffered, format="PNG")
            image_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

            pages_data.append({
                'page_num': page_num,
                'image_base64': image_base64,
                'width': image.width,
                'height': image.height,
            })

        logger.info(
            f"Vision extraction complete: {len(pages_data)} pages converted to images"
        )

        return pages_data

    except Exception as e:
        logger.error(f"Vision extraction error: {e}")
        raise


def convert_image_to_base64(image: Any) -> str:
    """Convert PIL Image to base64 string."""
    try:
        from io import BytesIO
        import base64
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode('utf-8')
    except Exception as e:
        logger.error(f"Image to base64 conversion error: {e}")
        raise
