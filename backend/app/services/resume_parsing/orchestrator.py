"""Main orchestration logic for resume parsing."""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from app.core.config import settings

from .analyzers import analyze_layout, calculate_complexity_score
from .extractors import (
    extract_docx_text_only,
    extract_docx_with_structure,
    extract_pdf_text_only,
    extract_pdf_with_structure,
    extract_with_vision,
)
from .parsers import parse_with_structured_ai, parse_with_vision
from .validators import validate_and_score

logger = logging.getLogger(__name__)

# Check if vision dependencies are available at module load time
_VISION_DEPENDENCIES_AVAILABLE = None

def _check_vision_dependencies() -> bool:
    """Check if vision extraction dependencies are installed."""
    global _VISION_DEPENDENCIES_AVAILABLE
    if _VISION_DEPENDENCIES_AVAILABLE is None:
        try:
            import pdf2image  # noqa: F401
            from PIL import Image  # noqa: F401
            _VISION_DEPENDENCIES_AVAILABLE = True
            logger.info("Vision parser dependencies (pdf2image, Pillow) are available")
        except ImportError:
            _VISION_DEPENDENCIES_AVAILABLE = False
            logger.warning(
                "Vision parser dependencies (pdf2image, Pillow) not installed. "
                "Complex resumes may have parsing issues. Install with: pip install pdf2image Pillow"
            )
    return _VISION_DEPENDENCIES_AVAILABLE


async def parse_resume(file_bytes: bytes, filename: str) -> dict[str, Any]:
    """
    Complete parsing flow:
    
    1. Detect file format (PDF, DOCX, DOC)
    2. Extract with structure preservation
    3. Analyze layout complexity
    4. Choose parsing method based on complexity
    5. Validate results and calculate confidence
    6. If confidence < threshold: Retry with vision parser
    7. Return parsed data with metadata
    
    Returns:
        {
            'success': bool,
            'data': {
                'name': str,
                'title': str,
                'email': str,
                'phone': str,
                'location': str,
                'summary': str,
                'sections': [...]
            },
            'metadata': {
                'complexity_score': float,
                'confidence_score': float,
                'parsing_method': str,
                'processing_time_ms': int,
                'issues': [str]
            },
            'raw_text': str
        }
    """
    start_time = time.time()
    
    try:
        # Add timeout protection
        max_time = getattr(settings, 'max_parsing_time_seconds', 60)
        result = await asyncio.wait_for(
            _parse_resume_internal(file_bytes, filename, start_time),
            timeout=max_time
        )
        return result
        
    except asyncio.TimeoutError:
        logger.error(f"Parsing timeout after {max_time} seconds")
        enable_legacy = getattr(settings, 'enable_legacy_parser', False)

        # Avoid running an additional heavy vision pass here – inner logic already
        # handled vision/legacy fallbacks where appropriate.
        if enable_legacy:
            return await _fallback_to_legacy(file_bytes, filename, start_time)
        else:
            return {
                'success': False,
                'error': f'Parsing timeout exceeded ({max_time} seconds). The resume may be too complex. Please try a simpler format or contact support.',
                'metadata': {
                    'processing_time_ms': int((time.time() - start_time) * 1000),
                    'complexity_score': 0.0,
                    'confidence_score': 0.0,
                    'parsing_method': 'timeout',
                    'issues': ['Processing timeout']
                }
            }
    except Exception as e:
        logger.error(f"Parsing failed: {e}", exc_info=True)
        enable_legacy = getattr(settings, 'enable_legacy_parser', False)
        if enable_legacy:
            return await _fallback_to_legacy(file_bytes, filename, start_time)
        else:
            return {
                'success': False,
                'error': str(e),
                'metadata': {
                    'processing_time_ms': int((time.time() - start_time) * 1000),
                    'complexity_score': 0.0,
                    'confidence_score': 0.0,
                    'parsing_method': 'error',
                    'issues': [str(e)]
                }
            }


async def _parse_resume_internal(
    file_bytes: bytes,
    filename: str,
    start_time: float
) -> dict[str, Any]:
    """Internal parsing implementation."""
    
    # 1. Detect file format
    file_type = _detect_file_type(file_bytes, filename)
    logger.info(f"Detected file type: {file_type} for {filename}")
    
    if file_type not in ['pdf', 'docx']:
        return {
            'success': False,
            'error': f'Unsupported file type: {file_type}. Please upload PDF or DOCX.',
            'metadata': {
                'processing_time_ms': int((time.time() - start_time) * 1000),
                'complexity_score': 0.0,
                'confidence_score': 0.0,
                'parsing_method': 'unsupported',
                'issues': [f'Unsupported file type: {file_type}']
            }
        }
    
    # 2. Extract with structure preservation
    try:
        if file_type == 'pdf':
            extracted_data = extract_pdf_with_structure(file_bytes)
            raw_text = extract_pdf_text_only(file_bytes)
        elif file_type == 'docx':
            extracted_data = extract_docx_with_structure(file_bytes)
            raw_text = extract_docx_text_only(file_bytes)
        else:
            raw_text = ""
            extracted_data = {}
        
        if not raw_text.strip():
            return {
                'success': False,
                'error': 'Could not extract text from file. The file might be empty or corrupted.',
                'metadata': {
                    'processing_time_ms': int((time.time() - start_time) * 1000),
                    'complexity_score': 0.0,
                    'confidence_score': 0.0,
                    'parsing_method': 'extraction_failed',
                    'issues': ['No text extracted']
                }
            }
            
    except Exception as e:
        logger.error(f"Extraction failed: {e}", exc_info=True)
        return {
            'success': False,
            'error': f'Extraction failed: {str(e)}',
            'metadata': {
                'processing_time_ms': int((time.time() - start_time) * 1000),
                'complexity_score': 0.0,
                'confidence_score': 0.0,
                'parsing_method': 'extraction_failed',
                'issues': [str(e)]
            }
        }
    
    # 3. Analyze layout complexity
    layout_data = analyze_layout(extracted_data, file_type)
    complexity_result = calculate_complexity_score(extracted_data, layout_data, file_type)
    complexity_score = complexity_result['complexity_score']
    recommended_method = complexity_result['recommended_method']
    
    # 4. Choose parsing method
    use_vision = getattr(settings, 'use_vision_parser', True)
    complexity_threshold = getattr(settings, 'complexity_threshold', 0.35)
    min_confidence = getattr(settings, 'min_confidence_score', 0.6)
    
    # Check if vision dependencies are actually available
    vision_available = _check_vision_dependencies() if use_vision else False
    if use_vision and not vision_available:
        logger.warning("Vision parser enabled but dependencies not installed - will use legacy parser for complex resumes")
        use_vision = False
    
    parsing_method = 'unknown'
    parsed_data = None
    
    # Check if resume has complex features
    has_columns = complexity_result.get('factors', {}).get('has_columns', False)
    
    # For complex resumes without vision parser, use legacy parser directly
    enable_legacy = getattr(settings, 'enable_legacy_parser', True)
    if (has_columns or complexity_score >= 0.30) and not vision_available and enable_legacy:
        logger.info(f"Complex resume (complexity={complexity_score:.2f}, has_columns={has_columns}) - using legacy parser (vision not available)")
        return await _fallback_to_legacy(file_bytes, filename, start_time)
    
    # Decision logic: Use vision parser for complex resumes (has columns OR complexity >= 0.30)
    # Lower threshold to avoid timeout issues with structured parser on complex resumes
    # But only if vision dependencies are available
    if file_type == 'pdf' and use_vision and vision_available and (has_columns or complexity_score >= 0.30):
        logger.info(f"Using vision parser (complexity={complexity_score:.2f}, has_columns={has_columns})")
        parsing_method = 'vision'
        try:
            vision_pages = extract_with_vision(file_bytes)
            parsed_data = await parse_with_vision(vision_pages)
        except ImportError as e:
            logger.error(f"Vision parser dependencies not available: {e}")
            logger.info("Falling back to structured parser (install pdf2image and Pillow for better results)")
            parsing_method = 'text_structured_fallback'
            # Wrap in timeout to prevent hanging
            try:
                parsed_data = await asyncio.wait_for(
                    parse_with_structured_ai(extracted_data, layout_data, raw_text),
                    timeout=45.0
                )
            except asyncio.TimeoutError:
                logger.error("Structured parser also timed out")
                # Try legacy parser as fallback
                enable_legacy = getattr(settings, 'enable_legacy_parser', True)
                if enable_legacy:
                    logger.info("Falling back to legacy parser after structured parser timeout")
                    return await _fallback_to_legacy(file_bytes, filename, start_time)
                parsed_data = _create_empty_parsed_data()
        except Exception as e:
            logger.warning(f"Vision parsing failed, falling back to structured: {e}")
            parsing_method = 'text_structured_fallback'
            try:
                parsed_data = await asyncio.wait_for(
                    parse_with_structured_ai(extracted_data, layout_data, raw_text),
                    timeout=45.0
                )
            except asyncio.TimeoutError:
                logger.error("Structured parser also timed out")
                # Try legacy parser as fallback
                enable_legacy = getattr(settings, 'enable_legacy_parser', True)
                if enable_legacy:
                    logger.info("Falling back to legacy parser after structured parser timeout")
                    return await _fallback_to_legacy(file_bytes, filename, start_time)
                parsed_data = _create_empty_parsed_data()
    elif file_type == 'pdf':
        # Simple resume - use structured parser with timeout
        logger.info("Using structured text parser (simple resume)")
        parsing_method = 'text_structured'
        try:
            parsed_data = await asyncio.wait_for(
                parse_with_structured_ai(extracted_data, layout_data, raw_text),
                timeout=45.0
            )
        except asyncio.TimeoutError:
                logger.error("Structured parser timed out after 45 seconds")
                # Try vision as fallback (only if dependencies available)
                if use_vision and vision_available:
                    try:
                        vision_pages = extract_with_vision(file_bytes)
                        parsed_data = await parse_with_vision(vision_pages)
                        parsing_method = 'vision_timeout_fallback'
                    except ImportError:
                        logger.error("Vision parser dependencies (pdf2image/Pillow) not installed")
                        logger.info("Falling back to legacy parser")
                        enable_legacy = getattr(settings, 'enable_legacy_parser', True)
                        if enable_legacy:
                            logger.info("Using legacy parser due to missing vision dependencies")
                            return await _fallback_to_legacy(file_bytes, filename, start_time)
                        parsed_data = _create_empty_parsed_data()
                    except Exception as vision_error:
                        logger.error(f"Vision fallback also failed: {vision_error}")
                        enable_legacy = getattr(settings, 'enable_legacy_parser', True)
                        if enable_legacy:
                            logger.info("Using legacy parser due to vision failure")
                            return await _fallback_to_legacy(file_bytes, filename, start_time)
                        parsed_data = _create_empty_parsed_data()
                else:
                    # Vision disabled or not available - try legacy parser immediately
                    enable_legacy = getattr(settings, 'enable_legacy_parser', True)
                    if enable_legacy:
                        logger.info("Structured parser timed out, using legacy parser as fallback")
                        return await _fallback_to_legacy(file_bytes, filename, start_time)
                    logger.warning("Legacy parser disabled, cannot handle timeout")
                    parsed_data = _create_empty_parsed_data()
    elif file_type == 'docx':
        # DOCX always uses structured parser with timeout
        logger.info("Using structured parser for DOCX")
        parsing_method = 'text_structured'
        try:
            parsed_data = await asyncio.wait_for(
                parse_with_structured_ai(extracted_data, layout_data, raw_text),
                timeout=45.0
            )
        except asyncio.TimeoutError:
            logger.error("DOCX structured parser timed out")
            enable_legacy = getattr(settings, 'enable_legacy_parser', True)
            if enable_legacy:
                logger.info("Falling back to legacy parser for DOCX")
                return await _fallback_to_legacy(file_bytes, filename, start_time)
            parsed_data = _create_empty_parsed_data()
    else:
        # Fallback - use structured parser with timeout
        logger.info("Using structured parser (fallback)")
        parsing_method = 'text_structured'
        try:
            parsed_data = await asyncio.wait_for(
                parse_with_structured_ai(extracted_data, layout_data, raw_text),
                timeout=45.0
            )
        except asyncio.TimeoutError:
            logger.error("Fallback structured parser timed out")
            enable_legacy = getattr(settings, 'enable_legacy_parser', True)
            if enable_legacy:
                logger.info("Falling back to legacy parser")
                return await _fallback_to_legacy(file_bytes, filename, start_time)
            parsed_data = _create_empty_parsed_data()
    
    # 5. Validate and calculate confidence
    validation_result = validate_and_score(parsed_data)
    confidence_score = validation_result['overall_confidence']
    issues = validation_result['issues']
    
    # 6. Retry with vision if confidence is low (only if dependencies available)
    if (confidence_score < min_confidence and 
        parsing_method != 'vision' and 
        parsing_method != 'vision_timeout_fallback' and
        file_type == 'pdf' and 
        use_vision and
        vision_available):
        logger.info(f"Low confidence ({confidence_score:.2f}), retrying with vision parser")
        try:
            vision_pages = extract_with_vision(file_bytes)
            parsed_data = await parse_with_vision(vision_pages)
            validation_result = validate_and_score(parsed_data)
            confidence_score = validation_result['overall_confidence']
            issues = validation_result['issues']
            parsing_method = 'vision_retry'
        except ImportError as e:
            logger.error(f"Vision parser dependencies not available for retry: {e}")
            # Try legacy parser if available
            enable_legacy = getattr(settings, 'enable_legacy_parser', True)
            if enable_legacy:
                logger.info("Trying legacy parser as last resort")
                return await _fallback_to_legacy(file_bytes, filename, start_time)
            logger.warning("Vision retry failed and legacy parser disabled - keeping low confidence result")
        except Exception as e:
            logger.warning(f"Vision retry failed: {e}")
            # Try legacy parser if available
            enable_legacy = getattr(settings, 'enable_legacy_parser', True)
            if enable_legacy and (not parsed_data.get('name') and not parsed_data.get('sections')):
                logger.info("Vision retry failed with no data, trying legacy parser")
                return await _fallback_to_legacy(file_bytes, filename, start_time)
            # Keep original result
    
    # 7. Validate we have some data before returning
    has_name = bool(parsed_data.get('name', '').strip())
    has_sections = bool(parsed_data.get('sections'))
    
    if not has_name and not has_sections:
        # No data extracted - try legacy parser if available
        logger.warning("No content extracted - trying legacy parser as fallback")
        enable_legacy = getattr(settings, 'enable_legacy_parser', True)
        if enable_legacy:
            logger.info("Falling back to legacy parser due to empty extraction")
            return await _fallback_to_legacy(file_bytes, filename, start_time)
        else:
            # Return error instead of empty data
            return {
                'success': False,
                'error': 'Could not extract meaningful content from resume. The resume may be too complex. Install vision parser dependencies (pip install pdf2image Pillow) or enable legacy parser (ENABLE_LEGACY_PARSER=true).',
                'metadata': {
                    'processing_time_ms': int((time.time() - start_time) * 1000),
                    'complexity_score': complexity_score,
                    'confidence_score': 0.0,
                    'parsing_method': parsing_method,
                    'issues': ['No content extracted', 'Vision dependencies not available' if not vision_available else 'Parsing failed']
                }
            }
    
    # 8. Format result for backward compatibility
    result = {
        'success': True,
        'data': {
            'name': parsed_data.get('name', ''),
            'title': parsed_data.get('title', ''),
            'email': parsed_data.get('email', ''),
            'phone': parsed_data.get('phone', ''),
            'location': parsed_data.get('location', ''),
            'summary': parsed_data.get('summary', ''),
            'sections': parsed_data.get('sections', [])
        },
        'metadata': {
            'complexity_score': complexity_score,
            'confidence_score': confidence_score,
            'parsing_method': parsing_method,
            'processing_time_ms': int((time.time() - start_time) * 1000),
            'issues': issues
        },
        'raw_text': raw_text[:1000]  # First 1000 chars for debugging
    }
    
    logger.info(
        f"Parsing complete: method={parsing_method}, "
        f"confidence={confidence_score:.2f}, "
        f"time={result['metadata']['processing_time_ms']}ms"
    )
    
    return result


def _create_empty_parsed_data() -> dict[str, Any]:
    """Create empty parsed data structure."""
    return {
        'name': '',
        'title': '',
        'email': '',
        'phone': '',
        'location': '',
        'summary': '',
        'sections': []
    }


def _detect_file_type(file_bytes: bytes, filename: str) -> str:
    """Detect file type from magic bytes and filename."""
    # Check magic bytes
    magic_bytes = file_bytes[:4]
    
    if magic_bytes == b"%PDF":
        return 'pdf'
    elif magic_bytes == b"PK\x03\x04":
        # ZIP-based format (DOCX, XLSX, etc.)
        filename_lower = filename.lower() if filename else ""
        if filename_lower.endswith('.docx'):
            return 'docx'
        elif filename_lower.endswith('.doc'):
            return 'doc'
    
    # Fallback to filename extension
    if filename:
        ext = filename.split('.')[-1].lower()
        if ext in ['pdf']:
            return 'pdf'
        elif ext in ['docx']:
            return 'docx'
        elif ext in ['doc']:
            return 'doc'
    
    return 'unknown'


async def _fallback_to_legacy(
    file_bytes: bytes,
    filename: str,
    start_time: float | None = None
) -> dict[str, Any]:
    """Fallback to legacy parser if enabled."""
    try:
        from app.services.resume_upload_legacy import upload_and_parse_resume
        logger.info("Falling back to legacy parser")
        result = await upload_and_parse_resume(file_bytes, filename, None)
        
        # Convert legacy format to new format
        processing_time = int((time.time() - start_time) * 1000) if start_time else 0
        
        if result.get('success'):
            return {
                'success': True,
                'data': result.get('data', {}),
                'metadata': {
                    'complexity_score': 0.0,
                    'confidence_score': 0.7,  # Assume moderate confidence for legacy
                    'parsing_method': 'legacy_fallback',
                    'processing_time_ms': processing_time,
                    'issues': []
                },
                'raw_text': result.get('raw_text', '')
            }
        else:
            return result
    except ImportError as e:
        logger.error(f"Legacy parser not available: {e}")
        processing_time = int((time.time() - start_time) * 1000) if start_time else 0
        return {
            'success': False,
            'error': 'Legacy parser not available. Please install vision parser dependencies (pip install pdf2image Pillow) or contact support.',
            'metadata': {
                'processing_time_ms': processing_time,
                'complexity_score': 0.0,
                'confidence_score': 0.0,
                'parsing_method': 'legacy_unavailable',
                'issues': ['Legacy parser import failed']
            }
        }
