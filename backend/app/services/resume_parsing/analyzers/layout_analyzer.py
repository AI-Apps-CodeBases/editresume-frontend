"""Analyze document layout to detect columns, sections, and hierarchies."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def analyze_layout(extracted_data: dict[str, Any], file_type: str) -> dict[str, Any]:
    """
    Analyze document layout to detect:
    - Column boundaries
    - Section headers
    - Text blocks with reading order
    - Hierarchy levels

    Args:
        extracted_data: Structured data from PDF or DOCX extractor
        file_type: 'pdf' or 'docx'

    Returns:
        {
            'columns': [
                {'page': int, 'regions': [(x_start, x_end), ...]}
            ],
            'headers': [
                {
                    'text': str,
                    'position': (x, y),
                    'page': int,
                    'level': int
                }
            ],
            'blocks': [
                {
                    'text': str,
                    'bbox': (x0, y0, x1, y1),
                    'page': int,
                    'column': int
                }
            ],
            'reading_order': [list of block indices in correct order]
        }
    """
    try:
        from sklearn.cluster import DBSCAN
        import numpy as np
    except ImportError:
        logger.warning("scikit-learn not available, using simplified layout analysis")
        return _analyze_layout_simple(extracted_data, file_type)

    if file_type == 'pdf':
        return _analyze_pdf_layout(extracted_data)
    elif file_type == 'docx':
        return _analyze_docx_layout(extracted_data)
    else:
        return _analyze_layout_simple(extracted_data, file_type)


def _analyze_pdf_layout(pdf_data: dict[str, Any]) -> dict[str, Any]:
    """Analyze PDF layout using word positions."""
    from sklearn.cluster import DBSCAN
    import numpy as np

    columns = []
    headers = []
    blocks = []
    reading_order = []

    for page_data in pdf_data.get('pages', []):
        page_num = page_data['page_num']
        words = page_data.get('words', [])

        if not words:
            continue

        # Column detection: cluster x-coordinates
        x_coords = np.array([[word['x0']] for word in words])
        if len(x_coords) > 1:
            clustering = DBSCAN(eps=50, min_samples=5).fit(x_coords)
            unique_labels = set(clustering.labels_)
            unique_labels.discard(-1)  # Remove noise

            column_regions = []
            for label in unique_labels:
                cluster_xs = [words[i]['x0'] for i, l in enumerate(clustering.labels_) if l == label]
                if cluster_xs:
                    x_start = min(cluster_xs)
                    x_end = max([words[i]['x1'] for i, l in enumerate(clustering.labels_) if l == label])
                    column_regions.append((x_start, x_end))

            if column_regions:
                column_regions.sort(key=lambda x: x[0])
                columns.append({
                    'page': page_num,
                    'regions': column_regions
                })
            else:
                # Single column
                columns.append({
                    'page': page_num,
                    'regions': [(0, 1000)]  # Default width
                })

        # Section header detection
        font_sizes = [word.get('size', 0) for word in words if word.get('size', 0) > 0]
        avg_font_size = np.mean(font_sizes) if font_sizes else 10

        for word in words:
            font_size = word.get('size', 0)
            text = word.get('text', '').strip()

            # Header indicators: larger font, ALL CAPS, bold
            if text and len(text) < 50:
                is_large = font_size > avg_font_size * 1.2
                is_all_caps = text.isupper() and len(text.split()) <= 5
                
                if is_large or is_all_caps:
                    headers.append({
                        'text': text,
                        'position': (word['x0'], word['y0']),
                        'page': page_num,
                        'level': 1 if font_size > avg_font_size * 1.5 else 2
                    })

        # Text block grouping
        current_block = None
        for word in sorted(words, key=lambda w: (w['y0'], w['x0'])):
            if current_block is None:
                current_block = {
                    'text': word['text'],
                    'bbox': (word['x0'], word['y0'], word['x1'], word['y1']),
                    'page': page_num,
                    'column': 0  # Will be determined by x position
                }
            else:
                # Check if word belongs to current block (same line or nearby)
                block_y0, block_y1 = current_block['bbox'][1], current_block['bbox'][3]
                word_y = word['y0']
                
                if abs(word_y - block_y0) < 5 or abs(word_y - block_y1) < 5:
                    # Same line or very close - add to block
                    current_block['text'] += ' ' + word['text']
                    current_block['bbox'] = (
                        min(current_block['bbox'][0], word['x0']),
                        min(current_block['bbox'][1], word['y0']),
                        max(current_block['bbox'][2], word['x1']),
                        max(current_block['bbox'][3], word['y1'])
                    )
                else:
                    # New block
                    blocks.append(current_block)
                    current_block = {
                        'text': word['text'],
                        'bbox': (word['x0'], word['y0'], word['x1'], word['y1']),
                        'page': page_num,
                        'column': 0
                    }

        if current_block:
            blocks.append(current_block)

        # Determine column for each block
        page_columns = next((c for c in columns if c['page'] == page_num), None)
        if page_columns:
            for block in blocks:
                if block['page'] == page_num:
                    block_x = block['bbox'][0]
                    for col_idx, (x_start, x_end) in enumerate(page_columns['regions']):
                        if x_start <= block_x <= x_end:
                            block['column'] = col_idx
                            break

    # Reading order: sort by page, then by y (top to bottom), then by x (left to right)
    reading_order = sorted(
        range(len(blocks)),
        key=lambda i: (
            blocks[i]['page'],
            blocks[i]['bbox'][1],  # y0
            blocks[i]['bbox'][0]   # x0
        )
    )

    return {
        'columns': columns,
        'headers': headers,
        'blocks': blocks,
        'reading_order': reading_order
    }


def _analyze_docx_layout(docx_data: dict[str, Any]) -> dict[str, Any]:
    """Analyze DOCX layout using paragraph styles."""
    columns = []
    headers = []
    blocks = []
    reading_order = []

    paragraphs = docx_data.get('paragraphs', [])
    has_tables = docx_data.get('metadata', {}).get('has_tables', False)

    # DOCX is typically single-column, but check for table-based columns
    if has_tables:
        columns.append({
            'page': 1,
            'regions': [(0, 500), (500, 1000)]  # Assume two columns if tables present
        })
    else:
        columns.append({
            'page': 1,
            'regions': [(0, 1000)]
        })

    # Detect headers by style and formatting
    font_sizes = [p.get('size', 0) for p in paragraphs if p.get('size', 0) > 0]
    avg_font_size = sum(font_sizes) / len(font_sizes) if font_sizes else 12

    for idx, para in enumerate(paragraphs):
        text = para.get('text', '').strip()
        if not text:
            continue

        font_size = para.get('size', avg_font_size)
        is_bold = para.get('bold', False)
        is_all_caps = text.isupper() and len(text.split()) <= 5

        # Header detection
        if (font_size > avg_font_size * 1.2) or (is_bold and len(text) < 50) or is_all_caps:
            headers.append({
                'text': text,
                'position': (0, idx * 20),  # Approximate position
                'page': 1,
                'level': 1 if font_size > avg_font_size * 1.5 else 2
            })

        # Create blocks from paragraphs
        blocks.append({
            'text': text,
            'bbox': (0, idx * 20, 1000, (idx + 1) * 20),
            'page': 1,
            'column': 0
        })

    reading_order = list(range(len(blocks)))

    return {
        'columns': columns,
        'headers': headers,
        'blocks': blocks,
        'reading_order': reading_order
    }


def _analyze_layout_simple(extracted_data: dict[str, Any], file_type: str) -> dict[str, Any]:
    """Simple layout analysis fallback when scikit-learn not available."""
    return {
        'columns': [{'page': 1, 'regions': [(0, 1000)]}],
        'headers': [],
        'blocks': [],
        'reading_order': []
    }
