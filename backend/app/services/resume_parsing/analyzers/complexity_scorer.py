"""Score resume complexity to determine parsing strategy."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def calculate_complexity_score(
    extracted_data: dict[str, Any],
    layout_data: dict[str, Any],
    file_type: str
) -> dict[str, Any]:
    """
    Score resume complexity from 0.0 to 1.0 based on layout features.
    
    Returns:
        {
            'complexity_score': float,  # 0.0 to 1.0
            'factors': {
                'has_columns': bool,
                'has_tables': bool,
                'has_images': bool,
                'font_variance': float,
                'non_standard_layout': bool
            },
            'recommended_method': str  # 'text_structured' or 'vision'
        }
    """
    score = 0.0
    factors = {
        'has_columns': False,
        'has_tables': False,
        'has_images': False,
        'font_variance': 0.0,
        'non_standard_layout': False
    }

    # Check for multiple columns
    columns = layout_data.get('columns', [])
    for col_data in columns:
        regions = col_data.get('regions', [])
        if len(regions) > 1:
            factors['has_columns'] = True
            score += 0.3
            break

    # Check for tables
    if file_type == 'pdf':
        pages = extracted_data.get('pages', [])
        for page in pages:
            tables = page.get('tables', [])
            if tables:
                factors['has_tables'] = True
                score += 0.2
                break
    elif file_type == 'docx':
        has_tables = extracted_data.get('metadata', {}).get('has_tables', False)
        if has_tables:
            factors['has_tables'] = True
            score += 0.2

    # Check for images
    if file_type == 'pdf':
        pages = extracted_data.get('pages', [])
        for page in pages:
            images = page.get('images', [])
            if images:
                factors['has_images'] = True
                score += 0.2
                break
        metadata = extracted_data.get('metadata', {})
        if metadata.get('has_images', False):
            factors['has_images'] = True
            score += 0.2

    # Calculate font size variance
    font_sizes = []
    if file_type == 'pdf':
        pages = extracted_data.get('pages', [])
        for page in pages:
            words = page.get('words', [])
            for word in words:
                size = word.get('size', 0)
                if size > 0:
                    font_sizes.append(size)
    elif file_type == 'docx':
        paragraphs = extracted_data.get('paragraphs', [])
        for para in paragraphs:
            size = para.get('size', 0)
            if size > 0:
                font_sizes.append(size)

    if font_sizes:
        try:
            import numpy as np
            variance = np.var(font_sizes)
            std_dev = np.std(font_sizes)
            mean_size = np.mean(font_sizes)
            
            # High variance indicates mixed font sizes
            coefficient_of_variation = std_dev / mean_size if mean_size > 0 else 0
            if coefficient_of_variation > 0.3:  # More than 30% variation
                factors['font_variance'] = float(coefficient_of_variation)
                score += 0.15
        except ImportError:
            # Simple variance calculation without numpy
            if len(font_sizes) > 1:
                mean = sum(font_sizes) / len(font_sizes)
                variance = sum((x - mean) ** 2 for x in font_sizes) / len(font_sizes)
                std_dev = variance ** 0.5
                coefficient_of_variation = std_dev / mean if mean > 0 else 0
                factors['font_variance'] = float(coefficient_of_variation)
                if coefficient_of_variation > 0.3:
                    score += 0.15

    # Check for non-standard layout (many headers, complex structure)
    headers = layout_data.get('headers', [])
    blocks = layout_data.get('blocks', [])
    
    # If many headers relative to blocks, might be complex
    if len(headers) > 0 and len(blocks) > 0:
        header_ratio = len(headers) / len(blocks)
        if header_ratio > 0.1:  # More than 10% headers
            factors['non_standard_layout'] = True
            score += 0.1

    # Cap score at 1.0
    score = min(score, 1.0)

    # Determine recommended method
    recommended_method = 'vision' if score >= 0.5 else 'text_structured'

    logger.info(
        f"Complexity score: {score:.2f}, recommended method: {recommended_method}, "
        f"factors: {factors}"
    )

    return {
        'complexity_score': float(score),
        'factors': factors,
        'recommended_method': recommended_method
    }
