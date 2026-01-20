"""Extract PDF content while preserving layout and structure."""

from __future__ import annotations

import logging
from io import BytesIO
from typing import Any

logger = logging.getLogger(__name__)


def extract_pdf_with_structure(file_bytes: bytes) -> dict[str, Any]:
    """
    Extract PDF content while preserving:
    - Word positions (x0, y0, x1, y1 coordinates)
    - Font information (size, weight, family)
    - Tables and structured elements
    - Reading order based on layout

    Returns:
        {
            'pages': [
                {
                    'page_num': int,
                    'words': [
                        {
                            'text': str,
                            'x0': float, 'y0': float,
                            'x1': float, 'y1': float,
                            'fontname': str,
                            'size': float
                        }
                    ],
                    'tables': [list of extracted tables],
                    'images': [list of image positions]
                }
            ],
            'metadata': {'page_count': int, 'has_images': bool}
        }
    """
    try:
        import pdfplumber
    except ImportError:
        logger.error("pdfplumber not installed")
        raise ImportError("pdfplumber is required for PDF extraction")

    pdf_file = BytesIO(file_bytes)
    pages_data = []
    has_images = False

    try:
        with pdfplumber.open(pdf_file) as pdf:
            total_pages = len(pdf.pages)
            logger.info(f"Extracting PDF with {total_pages} pages")

            for page_num, page in enumerate(pdf.pages, 1):
                page_words = []
                
                # Extract words with positions using pdfplumber
                words = page.extract_words(
                    x_tolerance=3,
                    y_tolerance=3,
                    keep_blank_chars=False,
                )

                for word in words:
                    word_data = {
                        'text': word.get('text', ''),
                        'x0': word.get('x0', 0.0),
                        'y0': word.get('top', 0.0),  # pdfplumber uses 'top' for y0
                        'x1': word.get('x1', 0.0),
                        'y1': word.get('bottom', 0.0),  # pdfplumber uses 'bottom' for y1
                        'fontname': word.get('fontname', ''),
                        'size': word.get('size', 0.0),
                    }
                    page_words.append(word_data)

                # Extract tables
                tables = page.extract_tables()
                extracted_tables = []
                if tables:
                    for table in tables:
                        extracted_tables.append(table)

                # Check for images
                if page.images:
                    has_images = True

                pages_data.append({
                    'page_num': page_num,
                    'words': page_words,
                    'tables': extracted_tables,
                    'images': page.images if page.images else [],
                })

            # Fallback to PyMuPDF for font metadata if pdfplumber doesn't provide it
            try:
                import fitz  # PyMuPDF
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                if len(doc) == total_pages:
                    for page_idx, (page, pdf_page) in enumerate(zip(pages_data, doc)):
                        for span in pdf_page.get_text("dict")["blocks"]:
                            if "spans" in span:
                                for span_item in span["spans"]:
                                    # Update font information if missing
                                    for word in page["words"]:
                                        if not word.get("fontname") and span_item.get("font"):
                                            word["fontname"] = span_item["font"]
                                        if not word.get("size") and span_item.get("size"):
                                            word["size"] = span_item["size"]
                doc.close()
            except ImportError:
                logger.warning("PyMuPDF not available for font metadata fallback")
            except Exception as e:
                logger.warning(f"PyMuPDF font metadata extraction failed: {e}")

            logger.info(
                f"PDF extraction complete: {total_pages} pages, "
                f"{sum(len(p['words']) for p in pages_data)} words extracted"
            )

            return {
                'pages': pages_data,
                'metadata': {
                    'page_count': total_pages,
                    'has_images': has_images,
                },
            }

    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        raise


def extract_pdf_text_only(file_bytes: bytes) -> str:
    """Extract plain text from PDF (fallback method)."""
    try:
        import pdfplumber
        pdf_file = BytesIO(file_bytes)
        text = ""
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    except Exception as e:
        logger.error(f"PDF text extraction error: {e}")
        raise
