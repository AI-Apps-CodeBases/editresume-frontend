"""Resume export service - PDF and DOCX generation"""

from __future__ import annotations

import logging
import re
from datetime import datetime
from io import BytesIO
from typing import Optional

from fastapi import HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.models import ExportPayload
from app.models import ExportAnalytics, Resume, User
from app.utils.resume_formatting import (
    apply_replacements,
    format_regular_bullets,
    format_work_experience_bullets,
    strip_bullet_markers,
)
from app.utils.resume_templates import TEMPLATES

logger = logging.getLogger(__name__)


def replace_cover_letter_placeholders(content: str, payload: ExportPayload) -> str:
    """Replace common cover letter placeholders with actual values"""
    if not content:
        return content
    
    # Remove email, phone, and date placeholders completely
    placeholders_to_remove = [
        '[Your Email]', '[Your email]', '[your email]', '[YOUR EMAIL]',
        '[Your Phone Number]', '[Your Phone]', '[Your phone]', '[your phone]', '[YOUR PHONE]',
        '[Date]', '[date]', '[DATE]',
        '{{email}}', '{{phone}}', '{{date}}',
        '[Your Phone Number]', '[Phone Number]', '[Phone]'
    ]
    
    result = content
    for placeholder in placeholders_to_remove:
        result = result.replace(placeholder, '')
    
    # Replace name and location placeholders
    replacements_map = {
        '[Your Name]': payload.name or '',
        '[Your Address]': payload.location or '',
        '[City, State, Zip]': payload.location or '',
        '{{name}}': payload.name or '',
        '{{location}}': payload.location or '',
        '{{address}}': payload.location or '',
    }
    
    replacements_map.update({
        '[Your name]': payload.name or '',
        '[your name]': payload.name or '',
        '[YOUR NAME]': payload.name or '',
    })
    
    for placeholder, value in replacements_map.items():
        result = result.replace(placeholder, value)
    
    # Apply any additional replacements from payload.replacements
    if payload.replacements:
        result = apply_replacements(result, payload.replacements)
    
    # Clean up multiple spaces and empty lines
    result = re.sub(r'\n\s*\n\s*\n+', '\n\n', result)
    result = re.sub(r' +', ' ', result)
    result = result.strip()
    
    return result


async def export_pdf(
    payload: ExportPayload,
    user_email: Optional[str] = None,
    db: Optional[Session] = None,
) -> Response:
    """Export resume as PDF"""
    try:
        import weasyprint
        from weasyprint import HTML
        
        weasyprint_version = weasyprint.__version__
        logger.info(f"WeasyPrint version: {weasyprint_version}")
        
        if weasyprint_version.startswith("62."):
            logger.error(
                f"WeasyPrint {weasyprint_version} has known bugs. Please upgrade to 63.0+ using: pip install --upgrade 'weasyprint>=63.0'"
            )

        replacements = payload.replacements or {}
        template_id = payload.template or "tech"
        template_style = TEMPLATES.get(template_id, TEMPLATES["tech"])
        template_config = payload.templateConfig if payload.templateConfig is not None else {}

        logger.info(f"Exporting PDF with template: {template_id}")
        logger.info(f"Template config provided: {bool(template_config)}")
        logger.info(f"Template config type: {type(template_config)}")
        logger.info(f"Template config keys: {list(template_config.keys()) if isinstance(template_config, dict) else 'N/A'}")
        if isinstance(template_config, dict) and template_config.get("typography"):
            typo = template_config.get("typography", {})
            font_sizes = typo.get("fontSize", {})
            logger.info(f"Font sizes in config: h1={font_sizes.get('h1')}, h2={font_sizes.get('h2')}, body={font_sizes.get('body')}")
        logger.info(
            f"Two-column settings: left={payload.two_column_left}, right={payload.two_column_right}, width={payload.two_column_left_width}"
        )

        # Use templateConfig if available and not empty, otherwise fall back to template lookup
        if template_config and isinstance(template_config, dict) and len(template_config) > 0:
            # Typography
            typography = template_config.get("typography", {})
            font_family_heading = typography.get("fontFamily", {}).get("heading", "Arial")
            font_family_body = typography.get("fontFamily", {}).get("body", "Arial")
            font_family = f"{font_family_heading}, {font_family_body}, sans-serif"
            
            # Design
            design = template_config.get("design", {})
            header_style = design.get("headerStyle", "left-aligned")
            # Match frontend logic: center if headerStyle is 'centered' OR template is one of: clean, two-column, compact, classic
            templates_that_center = ["clean", "two-column", "compact", "classic"]
            header_align = "center" if (header_style == "centered" or template_id in templates_that_center) else "left"
            header_border = "2px solid #000" if design.get("dividers", True) else "none"
            section_uppercase = "text-transform: uppercase;" if design.get("sectionUppercase", False) else ""
            
            # Bullet style
            bullet_style = design.get("bulletStyle", "circle")
            bullet_symbols = {
                "circle": "•",
                "square": "■",
                "dash": "—",
                "none": ""
            }
            bullet_symbol = bullet_symbols.get(bullet_style, "•")
            
            # Layout
            layout_config = template_config.get("layout", {})
            layout_columns = layout_config.get("columns", "single")
            layout = "two-column" if layout_columns in ["two-column", "asymmetric"] else "single"
            # Get column width from templateConfig if available
            template_column_width = layout_config.get("columnWidth")
            logger.info(f"Layout config: columns={layout_columns}, columnWidth from templateConfig={template_column_width}")
            
            # Colors
            colors = design.get("colors", {})
            primary_color = colors.get("primary", "#000000")
            text_color = colors.get("text", "#000000")
            
            # Spacing
            spacing_config = template_config.get("spacing", {})
            section_gap = spacing_config.get("sectionGap", 15)
            item_gap = spacing_config.get("itemGap", 6)
            page_margin = spacing_config.get("pageMargin", 24)
            
            # Font sizes
            h1_size = typography.get("fontSize", {}).get("h1", 24)
            h2_size = typography.get("fontSize", {}).get("h2", 12)
            body_size = typography.get("fontSize", {}).get("body", 11)
            line_height = typography.get("lineHeight", 1.4)
            
            logger.info(f"Using templateConfig values:")
            logger.info(f"  Font sizes: h1={h1_size}px, h2={h2_size}px, body={body_size}px, lineHeight={line_height}")
            logger.info(f"  Spacing: sectionGap={section_gap}px, itemGap={item_gap}px, pageMargin={page_margin}px")
            logger.info(f"  Colors: primary={primary_color}, text={text_color}")
            logger.info(f"  Layout: columns={layout_columns}, columnWidth={template_column_width}")
        else:
            # Fallback to template lookup
            font_family = template_style["styles"]["font"]
            header_align = template_style["styles"]["header_align"]
            header_border = template_style["styles"]["header_border"]
            section_uppercase = (
                "text-transform: uppercase;"
                if template_style["styles"]["section_uppercase"]
                else ""
            )
            layout = template_style["styles"]["layout"]
            primary_color = "#000000"
            text_color = "#000000"
            section_gap = 15
            item_gap = 6
            h1_size = 24
            h2_size = 12
            body_size = 11
            line_height = 1.4
            # Default bullet style for fallback
            bullet_style = "circle"
            bullet_symbols = {
                "circle": "•",
                "square": "■",
                "dash": "—",
                "none": ""
            }
            bullet_symbol = bullet_symbols.get(bullet_style, "•")
            
            logger.info(f"Using fallback font sizes: h1={h1_size}px, h2={h2_size}px, body={body_size}px, lineHeight={line_height}")

        # Build HTML content sections
        contact_info = apply_replacements(payload.email or "", replacements)
        if payload.phone:
            contact_info += " • " + apply_replacements(payload.phone, replacements)
        if payload.location:
            contact_info += " • " + apply_replacements(payload.location, replacements)

        # Check if this is a cover letter only export (no resume sections)
        is_cover_letter_only = bool(payload.cover_letter and not payload.sections and not payload.summary)
        
        # Add cover letter if provided
        cover_letter_html = ""
        if payload.cover_letter:
            # Replace placeholders with actual values
            cover_letter_content = replace_cover_letter_placeholders(payload.cover_letter, payload)
            
            # Convert to proper paragraphs instead of just <br> tags
            paragraphs = []
            for para in cover_letter_content.split('\n\n'):
                para = para.strip()
                if para:
                    # Replace single newlines within paragraph with spaces, then wrap in <p>
                    para = para.replace('\n', ' ').strip()
                    # Clean up multiple spaces
                    para = re.sub(r' +', ' ', para)
                    if para:
                        paragraphs.append(f'<p>{para}</p>')
            
            cover_letter_body = '\n                    '.join(paragraphs) if paragraphs else ''
            
            # For cover letter only exports, show title with company name and position title
            if is_cover_letter_only:
                title_parts = []
                if payload.company_name:
                    title_parts.append(payload.company_name)
                if payload.position_title:
                    title_parts.append(payload.position_title)
                cover_letter_title = ' - '.join(title_parts) if title_parts else "Cover Letter"
                title_html = f'<h1 class="cover-letter-title">{cover_letter_title}</h1>' if cover_letter_title else ''
            else:
                cover_letter_title = payload.company_name if payload.company_name else "Cover Letter"
                title_html = f'<h2>{cover_letter_title}</h2>'
            
            cover_letter_html = f"""
            <div class="cover-letter-section">
                {title_html}
                <div class="cover-letter-content">
                    {cover_letter_body}
                </div>
            </div>
            """

        # Determine layout from templateConfig or fallback
        is_two_column = layout == "two-column" or (
            template_config and 
            template_config.get("layout", {}).get("columns") in ["two-column", "asymmetric"]
        )
        
        # Build sections HTML
        if is_two_column:
            left_sections_html = ""
            right_sections_html = ""

            # Use localStorage configuration if provided, otherwise use smart default distribution
            left_section_ids = set(payload.two_column_left or [])
            right_section_ids = set(payload.two_column_right or [])
            
            # Check if summary should be in left or right column
            summary_id = "__summary__"
            summary_in_left = summary_id in left_section_ids
            summary_in_right = summary_id in right_section_ids
            
            # Add summary to appropriate column if it exists and is assigned
            if payload.summary and (summary_in_left or summary_in_right):
                summary_html = f"""
                <div class="section">
                    <h2>Professional Summary</h2>
                    <div class="summary">{apply_replacements(payload.summary, replacements)}</div>
                </div>"""
                if summary_in_left:
                    left_sections_html += summary_html
                elif summary_in_right:
                    right_sections_html += summary_html
            elif payload.summary and not left_section_ids and not right_section_ids:
                # Default: add summary to left column if no configuration exists
                summary_html = f"""
                <div class="section">
                    <h2>Professional Summary</h2>
                    <div class="summary">{apply_replacements(payload.summary, replacements)}</div>
                </div>"""
                left_sections_html += summary_html

            # If no configuration provided, use smart distribution: Skills, Certificates, Education on left
            if not left_section_ids and not right_section_ids:
                # Default distribution: Skills, Certificates, Education on left; everything else on right
                left_column_keywords = ['skill', 'certificate', 'certification', 'education', 'academic', 'qualification', 'award', 'honor']
                
                for s in payload.sections:
                    section_title_lower = s.title.lower()
                    # Skip summary section as it's already added above
                    if 'summary' in section_title_lower or 'professional summary' in section_title_lower:
                        continue
                    
                    is_left_column = any(keyword in section_title_lower for keyword in left_column_keywords)
                    
                    section_title = s.title.lower()
                    is_work_experience = (
                        "experience" in section_title
                        or "work" in section_title
                        or "employment" in section_title
                    )

                    if is_work_experience:
                        bullets_html = format_work_experience_bullets(
                            s.bullets, replacements
                        )
                        section_html = f"""
                        <div class="section">
                            <h2>{apply_replacements(s.title, replacements)}</h2>
                            {bullets_html}
                        </div>"""
                    else:
                        bullets_html = format_regular_bullets(s.bullets, replacements, s.title)
                        section_title_formatted = apply_replacements(s.title, replacements)
                        section_lower = s.title.lower()
                        is_skill_section = (
                            "skill" in section_lower
                            or "technical" in section_lower
                            or "technology" in section_lower
                            or "competencies" in section_lower
                            or "expertise" in section_lower
                            or "proficiencies" in section_lower
                        )
                        if is_skill_section:
                            section_html = f"""
                            <div class="section">
                                <h2>{section_title_formatted}</h2>
                                {bullets_html}
                            </div>"""
                        else:
                            section_html = f"""
                            <div class="section">
                                <h2>{section_title_formatted}</h2>
                                <ul>
                                    {bullets_html}
                                </ul>
                            </div>"""

                    if is_left_column:
                        left_sections_html += section_html
                    else:
                        right_sections_html += section_html
            else:
                # Use provided configuration
                for s in payload.sections:
                    section_title = s.title.lower()
                    # Skip summary section as it's already added above
                    if 'summary' in section_title or 'professional summary' in section_title:
                        continue
                    
                    is_work_experience = (
                        "experience" in section_title
                        or "work" in section_title
                        or "employment" in section_title
                    )

                    if is_work_experience:
                        bullets_html = format_work_experience_bullets(
                            s.bullets, replacements
                        )
                        section_html = f"""
                        <div class="section">
                            <h2>{apply_replacements(s.title, replacements)}</h2>
                            {bullets_html}
                        </div>"""
                    else:
                        bullets_html = format_regular_bullets(s.bullets, replacements, s.title)
                        section_title = apply_replacements(s.title, replacements)
                        section_lower = s.title.lower()
                        is_skill_section = (
                            "skill" in section_lower
                            or "technical" in section_lower
                            or "technology" in section_lower
                            or "competencies" in section_lower
                            or "expertise" in section_lower
                            or "proficiencies" in section_lower
                        )
                        if is_skill_section:
                            section_html = f"""
                            <div class="section">
                                <h2>{section_title}</h2>
                                {bullets_html}
                            </div>"""
                        else:
                            section_html = f"""
                            <div class="section">
                                <h2>{section_title}</h2>
                                <ul>
                                    {bullets_html}
                                </ul>
                            </div>"""

                    if s.id and s.id in left_section_ids:
                        left_sections_html += section_html
                    elif s.id and s.id in right_section_ids:
                        right_sections_html += section_html

            # Calculate column widths with spacing
            # Use templateConfig columnWidth if available, otherwise use payload value, otherwise default to 50
            if template_config and isinstance(template_config, dict):
                layout_config = template_config.get("layout", {})
                template_column_width = layout_config.get("columnWidth")
                if template_column_width is not None:
                    left_width_percent = template_column_width
                    logger.info(f"Using column width from templateConfig: {left_width_percent}%")
                else:
                    left_width_percent = payload.two_column_left_width or 50
                    logger.info(f"templateConfig columnWidth not found, using payload value: {left_width_percent}%")
            else:
                left_width_percent = payload.two_column_left_width or 50
                logger.info(f"No templateConfig, using payload value: {left_width_percent}%")
            
            gap_percent = 2
            # Adjust right width to account for gap
            right_width_percent = 100 - left_width_percent - gap_percent
            logger.info(f"Final column widths: left={left_width_percent}%, right={right_width_percent}% (gap={gap_percent}%)")

            content_html = f"""
            {cover_letter_html}
            <table class="two-column" style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td class="column" style="width: {left_width_percent}%; padding-right: 1%; vertical-align: top;">{left_sections_html}</td>
                    <td class="column" style="width: {right_width_percent}%; vertical-align: top;">{right_sections_html}</td>
                </tr>
            </table>"""
        else:
            # Single column layout
            summary_html = (
                f'<div class="summary">{apply_replacements(payload.summary, replacements)}</div>'
                if payload.summary
                else ""
            )
            sections_html = ""
            for s in payload.sections:
                section_title = s.title.lower()
                is_work_experience = (
                    "experience" in section_title
                    or "work" in section_title
                    or "employment" in section_title
                )

                if is_work_experience:
                    bullets_html = format_work_experience_bullets(
                        s.bullets, replacements
                    )
                    sections_html += f"""
                    <div class="section">
                        <h2>{apply_replacements(s.title, replacements)}</h2>
                        {bullets_html}
                    </div>"""
                else:
                    bullets_html = format_regular_bullets(s.bullets, replacements, s.title)
                    section_title = apply_replacements(s.title, replacements)
                    section_lower = s.title.lower()
                    is_skill_section = (
                        "skill" in section_lower
                        or "technical" in section_lower
                        or "technology" in section_lower
                        or "competencies" in section_lower
                        or "expertise" in section_lower
                        or "proficiencies" in section_lower
                    )
                    if is_skill_section:
                        sections_html += f"""
                        <div class="section">
                            <h2>{section_title}</h2>
                            {bullets_html}
                        </div>"""
                    else:
                        sections_html += f"""
                        <div class="section">
                            <h2>{section_title}</h2>
                            <ul>
                                {bullets_html}
                            </ul>
                        </div>"""
            content_html = cover_letter_html + summary_html + sections_html

        # Set page margin based on export type
        if is_cover_letter_only:
            # Professional margins for cover letter (2.5cm = ~1 inch)
            page_margin_cm = "2.5cm"
            logger.info(f"Page margin set to 2.5cm for cover letter only export")
        else:
            # Minimal margin for resume to maximize content area
            page_margin_cm = "0.1cm"
            logger.info(f"Page margin set to 0.1cm to fill entire A4 page")
        
        # Build bullet CSS based on bullet style
        bullet_css = ""
        if bullet_style != 'none':
            bullet_css = f'.section li::before {{ content: "{bullet_symbol}"; font-weight: bold; color: {primary_color}; position: absolute; left: 0; top: 0; }}'
        bullet_padding = "padding-left: 14px;" if bullet_style != 'none' else "padding-left: 0;"
        
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {{ size: A4; margin: {page_margin_cm}; }}
        body {{ margin: 0; padding: 0 0 0 0.3cm; width: 100%; font-family: {font_family}; font-size: {body_size}px; line-height: {line_height}; color: {text_color}; {'text-align: justify;' if is_cover_letter_only else ''} }}
        .header {{ text-align: {header_align}; border-bottom: {header_border}; padding-bottom: 10px; margin-bottom: {section_gap}px; }}
        .header h1 {{ margin: 0; font-size: {h1_size}px; font-weight: bold; color: {primary_color}; }}
        .header .title {{ font-size: {h2_size + 2}px; margin: 5px 0; color: {text_color}; }}
        .header .contact {{ font-size: {body_size}px; color: {text_color}; margin-top: 5px; }}
        .summary {{ margin-bottom: {section_gap}px; font-size: {body_size}px; line-height: {line_height}; color: {text_color}; }}
        .section {{ margin-bottom: {section_gap}px; }}
        .section h2 {{ font-size: {h2_size}px; font-weight: bold; color: {primary_color}; {section_uppercase}
                       border-bottom: 1px solid {primary_color}; padding-bottom: 3px; margin-bottom: 8px; }}
        .section ul {{ margin: 0; padding-left: 0; list-style: none; }}
        .section li {{ margin-bottom: {item_gap}px; font-size: {body_size}px; color: {text_color}; position: relative; {bullet_padding} }}
        {bullet_css}
        .section li * {{ display: inline; }}
        .section li strong {{ font-weight: bold; }}
        .company-name-line strong {{ font-weight: bold; }}
        .job-title strong {{ font-weight: bold; }}
        .job-entry {{ margin-bottom: 20px; }}
        .company-header {{ margin-bottom: 8px; }}
        .company-name-line {{ font-weight: bold; font-size: 1.1em; color: {primary_color}; margin-bottom: 3px; }}
        .company-title-line {{ display: flex; justify-content: space-between; align-items: center; font-size: {body_size}px; }}
        .job-title {{ font-weight: 500; color: {text_color}; }}
        .job-date {{ color: #666666; font-size: {body_size - 1}px; }}
        .skills-section {{ font-size: {body_size}px; color: {text_color}; line-height: {line_height}; }}
        .job-separator {{ height: 10px; }}
        .two-column {{ 
            width: 100%; 
            border-collapse: collapse;
            table-layout: fixed;
        }}
        .two-column td.column {{
            vertical-align: top;
            padding: 0;
        }}
        .two-column td.column:first-child {{
            padding-right: 1%;
        }}
        .clearfix {{ clear: both; }}
        .cover-letter-section {{ margin-bottom: 20px; {'page-break-after: always;' if not is_cover_letter_only else ''} }}
        .cover-letter-section h2 {{ 
            font-size: {h2_size + 4 if is_cover_letter_only else h2_size + 2}px; 
            font-weight: bold; 
            margin-bottom: {20 if is_cover_letter_only else 15}px; 
            {'border-bottom: 2px solid ' + primary_color + ';' if not is_cover_letter_only else ''} 
            padding-bottom: {10 if is_cover_letter_only else 5}px; 
            {'color: ' + primary_color + ';' if not is_cover_letter_only else ''} 
        }}
        .cover-letter-title {{
            font-size: {h1_size}px;
            font-weight: bold;
            margin-bottom: 30px;
            margin-top: 0;
            text-align: center;
            color: {primary_color};
        }}
        .cover-letter-content {{ 
            font-size: {body_size + 2 if is_cover_letter_only else body_size + 1}px; 
            line-height: {line_height + 0.3 if is_cover_letter_only else line_height + 0.1}; 
            text-align: justify; 
            margin-top: {20 if is_cover_letter_only else 0}px; 
        }}
        .cover-letter-content p {{
            margin: 0 0 {12 if is_cover_letter_only else 8}px 0;
            padding: 0;
        }}
        .cover-letter-content p:last-child {{
            margin-bottom: 0;
        }}
    </style>
</head>
<body>
    {f'<div class="header"><h1>{apply_replacements(payload.name, replacements)}</h1><div class="title">{apply_replacements(payload.title, replacements)}</div><div class="contact">{contact_info}</div></div>' if not is_cover_letter_only else ''}
    {content_html}
</body>
</html>"""

        logger.info(f"Generated HTML length: {len(html_content)}")
        logger.info(f"Layout type: {layout}")
        
        # Final cleanup: remove any remaining ** characters that might have slipped through
        # This ensures no ** characters appear in the final PDF
        # Do this multiple times to catch nested or edge cases
        while '**' in html_content:
            html_content = html_content.replace('**', '')

        try:
            pdf_bytes = HTML(string=html_content).write_pdf()
            
            if not pdf_bytes or len(pdf_bytes) == 0:
                logger.error("PDF generation returned empty bytes")
                raise HTTPException(
                    status_code=500,
                    detail="PDF generation failed: Empty PDF file was generated. Please check your resume content."
                )
            
            if not isinstance(pdf_bytes, bytes):
                logger.error(f"PDF generation returned invalid type: {type(pdf_bytes)}")
                raise HTTPException(
                    status_code=500,
                    detail="PDF generation failed: Invalid PDF data type."
                )
            
            if not pdf_bytes.startswith(b"%PDF-"):
                logger.error(f"PDF validation failed: Invalid PDF header. First 20 bytes: {pdf_bytes[:20]}")
                raise HTTPException(
                    status_code=500,
                    detail="PDF generation failed: Generated file is not a valid PDF. Please try again or contact support."
                )
            
            logger.info(f"PDF generated successfully, size: {len(pdf_bytes)} bytes, header: {pdf_bytes[:8]}")
        except AttributeError as e:
            if "'super' object has no attribute" in str(e) or "transform" in str(e):
                logger.error(f"WeasyPrint compatibility error: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail="PDF generation failed due to a compatibility issue. Please upgrade WeasyPrint to 63.0+ or contact support."
                )
            raise
        except Exception as pdf_error:
            error_msg = str(pdf_error)
            logger.error(f"WeasyPrint PDF generation error: {error_msg}")
            
            if "transform" in error_msg.lower() or "super" in error_msg.lower():
                raise HTTPException(
                    status_code=500,
                    detail="PDF generation failed due to a compatibility issue. Please upgrade WeasyPrint to 63.0+ or contact support."
                )
            elif "font" in error_msg.lower() or "glyph" in error_msg.lower():
                raise HTTPException(
                    status_code=500,
                    detail="PDF generation failed due to font issues. Please try a different font or contact support."
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"PDF generation failed: {error_msg}. Please check your resume content and try again."
                )

        # Track export analytics
        if user_email and db:
            try:
                user = db.query(User).filter(User.email == user_email).first()
                if user:
                    # Find or create resume record
                    resume = (
                        db.query(Resume)
                        .filter(Resume.user_id == user.id, Resume.name == payload.name)
                        .first()
                    )

                    if not resume:
                        resume = Resume(
                            user_id=user.id,
                            name=payload.name,
                            title=payload.title,
                            email=payload.email,
                            phone=payload.phone,
                            location=payload.location,
                            summary=payload.summary,
                            template=template_id,
                        )
                        db.add(resume)
                        db.commit()
                        db.refresh(resume)

                    # Create export analytics record
                    export_analytics = ExportAnalytics(
                        user_id=user.id,
                        resume_id=resume.id,
                        export_format="pdf",
                        template_used=template_id,
                        file_size=len(pdf_bytes),
                        export_success=True,
                    )
                    db.add(export_analytics)
                    db.commit()

                    logger.info(
                        f"Export analytics tracked for user {user_email}: PDF export"
                    )
            except Exception as e:
                logger.error(f"Failed to track export analytics: {e}")

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=resume.pdf"},
        )
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"PDF export validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid resume data: {str(e)}"
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"PDF export error: {error_msg}")
        import traceback
        logger.error(traceback.format_exc())
        
        if "template" in error_msg.lower():
            raise HTTPException(
                status_code=400,
                detail="Invalid template configuration. Please select a valid template and try again."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="An error occurred while generating the PDF. Please try again or contact support if the issue persists."
            )


async def export_docx(
    payload: ExportPayload,
    user_email: Optional[str] = None,
    db: Optional[Session] = None,
) -> Response:
    """Export resume as DOCX"""
    try:
        from docx import Document
        from docx.shared import Pt, Inches
        from docx.enum.text import WD_ALIGN_PARAGRAPH

        replacements = payload.replacements or {}
        template_id = payload.template or "tech"
        template_style = TEMPLATES.get(template_id, TEMPLATES["tech"])
        template_config = payload.templateConfig or {}

        logger.info(f"Exporting DOCX with template: {template_id}")
        logger.info(f"Template config provided: {bool(template_config)}")
        logger.info(
            f"Two-column settings: left={payload.two_column_left}, right={payload.two_column_right}, width={payload.two_column_left_width}"
        )

        # Use templateConfig if available, otherwise fall back to template lookup
        if template_config:
            layout_config = template_config.get("layout", {})
            layout_columns = layout_config.get("columns", "single")
            layout = "two-column" if layout_columns in ["two-column", "asymmetric"] else "single"
            
            typography = template_config.get("typography", {})
            font_family_heading = typography.get("fontFamily", {}).get("heading", "Arial")
            font_family_body = typography.get("fontFamily", {}).get("body", "Arial")
            h1_size = typography.get("fontSize", {}).get("h1", 24)
            h2_size = typography.get("fontSize", {}).get("h2", 12)
            body_size = typography.get("fontSize", {}).get("body", 11)
            
            design = template_config.get("design", {})
            header_style = design.get("headerStyle", "left-aligned")
            # Match frontend logic: center if headerStyle is 'centered' OR template is one of: clean, two-column, compact, classic
            templates_that_center = ["clean", "two-column", "compact", "classic"]
            header_align = "center" if (header_style == "centered" or template_id in templates_that_center) else "left"
            
            spacing_config = template_config.get("spacing", {})
            page_margin = spacing_config.get("pageMargin", 24)
            page_margin_inches = Inches(page_margin / 96)  # Convert px to inches (assuming 96 DPI)
        else:
            layout = template_style["styles"]["layout"]
            font_family_heading = "Arial" if "Arial" in template_style["styles"]["font"] else "Georgia"
            font_family_body = font_family_heading
            h1_size = 18
            h2_size = 12
            body_size = 11
            header_align = template_style["styles"]["header_align"]
            page_margin_inches = Inches(1)

        doc = Document()

        section = doc.sections[0]
        # Check if this is a cover letter only export (no resume sections)
        is_cover_letter_only = bool(payload.cover_letter and not payload.sections and not payload.summary)
        
        # For cover letter only, use larger margins for professional appearance
        if is_cover_letter_only:
            page_margin_inches = Inches(1.5)  # 1.5 inches margins for cover letters
        
        section.top_margin = page_margin_inches
        section.bottom_margin = page_margin_inches
        section.left_margin = page_margin_inches
        section.right_margin = page_margin_inches

        # Only add header (name, title, contact) if not cover letter only
        if not is_cover_letter_only:
            name_para = doc.add_paragraph()
            name_run = name_para.add_run(apply_replacements(payload.name, replacements))
            name_run.font.size = Pt(h1_size)
            name_run.font.bold = True
            name_run.font.name = font_family_heading
            if header_align == "center":
                name_para.alignment = WD_ALIGN_PARAGRAPH.CENTER

            title_para = doc.add_paragraph()
            title_run = title_para.add_run(apply_replacements(payload.title, replacements))
            title_run.font.size = Pt(h2_size)
            title_run.font.name = font_family_body
            if header_align == "center":
                title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER

            contact_parts = []
            if payload.email:
                contact_parts.append(apply_replacements(payload.email, replacements))
            if payload.phone:
                contact_parts.append(apply_replacements(payload.phone, replacements))
            if payload.location:
                contact_parts.append(apply_replacements(payload.location, replacements))

            if contact_parts:
                contact_para = doc.add_paragraph(" • ".join(contact_parts))
                contact_para.runs[0].font.size = Pt(body_size)
                contact_para.runs[0].font.name = font_family_body
                if header_align == "center":
                    contact_para.alignment = WD_ALIGN_PARAGRAPH.CENTER

            doc.add_paragraph()

        # Add cover letter if provided
        if payload.cover_letter:
            # Replace placeholders with actual values
            cover_letter_content = replace_cover_letter_placeholders(payload.cover_letter, payload)
            
            # For cover letter only exports, show title with company name and position title
            if is_cover_letter_only:
                title_parts = []
                if payload.company_name:
                    title_parts.append(payload.company_name)
                if payload.position_title:
                    title_parts.append(payload.position_title)
                cover_letter_title = ' - '.join(title_parts) if title_parts else "Cover Letter"
                
                if cover_letter_title:
                    cover_letter_heading = doc.add_paragraph()
                    cover_letter_heading_run = cover_letter_heading.add_run(cover_letter_title)
                    cover_letter_heading_run.font.size = Pt(18)
                    cover_letter_heading_run.font.bold = True
                    cover_letter_heading_run.font.name = font_family_heading
                    cover_letter_heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    doc.add_paragraph()
            else:
                # Use company name for title if provided, otherwise "Cover Letter"
                cover_letter_title = payload.company_name if payload.company_name else "Cover Letter"
                cover_letter_heading = doc.add_paragraph()
                cover_letter_heading_run = cover_letter_heading.add_run(cover_letter_title)
                cover_letter_heading_run.font.size = Pt(14)
                cover_letter_heading_run.font.bold = True
                cover_letter_heading_run.font.name = font_family_heading
                doc.add_paragraph()

            # Format cover letter content with proper paragraphs
            # Split by double newlines to get paragraphs
            paragraphs = cover_letter_content.split('\n\n')
            for para in paragraphs:
                para = para.strip()
                if para:
                    # Replace single newlines within paragraph with spaces
                    para = para.replace('\n', ' ').strip()
                    # Clean up multiple spaces
                    para = re.sub(r' +', ' ', para)
                    if para:
                        cover_letter_para = doc.add_paragraph(para)
                        cover_letter_para.runs[0].font.size = Pt(12 if is_cover_letter_only else 11)
                        cover_letter_para.runs[0].font.name = font_family_body
                        cover_letter_para.paragraph_format.space_after = Pt(12 if is_cover_letter_only else 8)
                        cover_letter_para.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

            doc.add_paragraph()  # Add spacing

        # Determine layout from templateConfig or fallback
        is_two_column = layout == "two-column" or (
            template_config and 
            template_config.get("layout", {}).get("columns") in ["two-column", "asymmetric"]
        )
        
        logger.info(
            f"Layout decision: layout='{layout}', is_two_column={is_two_column}"
        )
        if is_two_column:
            logger.info("Creating two-column layout")
            from docx.oxml import OxmlElement
            from docx.oxml.ns import qn

            # Create a table for two-column layout
            table = doc.add_table(rows=1, cols=2)
            table.autofit = False
            table.allow_autofit = False

            # Remove table borders
            tbl = table._element
            tblPr = tbl.tblPr
            if tblPr is None:
                tblPr = OxmlElement("w:tblPr")
                tbl.insert(0, tblPr)

            tblBorders = OxmlElement("w:tblBorders")
            for border_name in ["top", "left", "bottom", "right", "insideH", "insideV"]:
                border = OxmlElement(f"w:{border_name}")
                border.set(qn("w:val"), "none")
                border.set(qn("w:sz"), "0")
                border.set(qn("w:space"), "0")
                border.set(qn("w:color"), "auto")
                tblBorders.append(border)
            tblPr.append(tblBorders)

            # Set column widths based on user preference
            left_width_percent = payload.two_column_left_width or 50
            right_width_percent = 100 - left_width_percent

            # Convert percentages to inches (assuming 8.5" total width)
            left_width_inches = (left_width_percent / 100) * 8.5
            right_width_inches = (right_width_percent / 100) * 8.5

            table.columns[0].width = Inches(left_width_inches)
            table.columns[1].width = Inches(right_width_inches)

            logger.info(
                f'Column widths: left={left_width_inches:.1f}", right={right_width_inches:.1f}"'
            )

            # Left column
            left_cell = table.cell(0, 0)
            # Clear existing paragraphs in left cell
            for paragraph in left_cell.paragraphs:
                paragraph.clear()

            # Right column
            right_cell = table.cell(0, 1)
            # Clear existing paragraphs in right cell
            for paragraph in right_cell.paragraphs:
                paragraph.clear()

            # Use localStorage configuration if provided, otherwise fallback to alternating
            left_section_ids = set(payload.two_column_left or [])
            right_section_ids = set(payload.two_column_right or [])

            logger.info(
                f"Section IDs from payload: left={left_section_ids}, right={right_section_ids}"
            )
            logger.info(
                f"Available sections: {[s.id for s in payload.sections if s.id]}"
            )

            if not left_section_ids and not right_section_ids:
                # Use smart default distribution: Skills, Certificates, Education on left
                logger.info(
                    "Using smart default distribution - no localStorage configuration provided"
                )
                left_column_keywords = ['skill', 'certificate', 'certification', 'education', 'academic', 'qualification', 'award', 'honor']
                
                left_sections = [
                    s for s in payload.sections 
                    if any(keyword in s.title.lower() for keyword in left_column_keywords)
                ]
                right_sections = [
                    s for s in payload.sections 
                    if not any(keyword in s.title.lower() for keyword in left_column_keywords)
                ]
            else:
                # Use provided configuration
                logger.info("Using localStorage configuration")
                left_sections = [
                    s for s in payload.sections if s.id and s.id in left_section_ids
                ]
                right_sections = [
                    s for s in payload.sections if s.id and s.id in right_section_ids
                ]

            logger.info(
                f"Final section distribution: left={[s.title for s in left_sections]}, right={[s.title for s in right_sections]}"
            )
            logger.info(
                f"Left sections count: {len(left_sections)}, Right sections count: {len(right_sections)}"
            )

            # Add summary to appropriate column if assigned
            summary_id = "__summary__"
            summary_in_left = summary_id in left_section_ids
            summary_in_right = summary_id in right_section_ids
            
            if payload.summary and (summary_in_left or summary_in_right):
                summary_title = "Professional Summary"
                if template_style.get("styles", {}).get("section_uppercase", False):
                    summary_title = summary_title.upper()
                
                target_cell = left_cell if summary_in_left else right_cell
                summary_para = target_cell.add_paragraph()
                summary_heading = summary_para.add_run(summary_title)
                summary_heading.font.size = Pt(h2_size)
                summary_heading.font.bold = True
                summary_heading.font.name = font_family_heading
                
                summary_content_para = target_cell.add_paragraph()
                summary_content = summary_content_para.add_run(apply_replacements(payload.summary, replacements))
                summary_content.font.size = Pt(body_size)
                summary_content.font.name = font_family_body
                
                target_cell.add_paragraph()  # Add spacing
            elif payload.summary and not left_section_ids and not right_section_ids:
                # Default: add summary to left column
                summary_title = "Professional Summary"
                if template_style.get("styles", {}).get("section_uppercase", False):
                    summary_title = summary_title.upper()
                
                summary_para = left_cell.add_paragraph()
                summary_heading = summary_para.add_run(summary_title)
                summary_heading.font.size = Pt(h2_size)
                summary_heading.font.bold = True
                summary_heading.font.name = font_family_heading
                
                summary_content_para = left_cell.add_paragraph()
                summary_content = summary_content_para.add_run(apply_replacements(payload.summary, replacements))
                summary_content.font.size = Pt(body_size)
                summary_content.font.name = font_family_body
                
                left_cell.add_paragraph()  # Add spacing

            # Add sections to left column
            for s in left_sections:
                section_title = apply_replacements(s.title, replacements)
                if template_style["styles"]["section_uppercase"]:
                    section_title = section_title.upper()

                heading_para = left_cell.add_paragraph()
                heading_run = heading_para.add_run(section_title)
                heading_run.font.size = Pt(12)
                heading_run.font.bold = True
                heading_run.font.name = (
                    "Arial"
                    if "Arial" in template_style["styles"]["font"]
                    else "Georgia"
                )

                # Check section type
                section_lower = s.title.lower()
                is_work_experience = (
                    "experience" in section_lower
                    or "work" in section_lower
                    or "employment" in section_lower
                )
                is_skill_section = (
                    "skill" in section_lower
                    or "technical" in section_lower
                    or "technology" in section_lower
                    or "competencies" in section_lower
                    or "expertise" in section_lower
                    or "proficiencies" in section_lower
                )

                # Create content for this section
                if s.bullets:
                    if is_work_experience:
                        # Work experience - handle company headers
                        for b in s.bullets:
                            if not b.text.strip():
                                continue
                            bullet_text = apply_replacements(b.text, replacements)
                            
                            # Check if company header
                            if bullet_text.startswith("**") and "**" in bullet_text[2:]:
                                header_text = bullet_text.replace("**", "").strip()
                                parts = header_text.split(' / ')
                                company_name = parts[0] if parts else ''
                                location = parts[1] if len(parts) >= 4 else ''
                                title = parts[2] if len(parts) >= 4 else (parts[1] if len(parts) >= 2 else '')
                                date_range = parts[3] if len(parts) >= 4 else (parts[2] if len(parts) >= 3 else '')
                                
                                # Company header - Line 1
                                company_para = left_cell.add_paragraph()
                                company_line = company_name
                                if location:
                                    company_line += f' / {location}'
                                company_run = company_para.add_run(company_line)
                                company_run.font.size = Pt(11)
                                company_run.font.bold = True
                                
                                # Company header - Line 2
                                title_para = left_cell.add_paragraph()
                                title_run = title_para.add_run(title)
                                title_run.font.size = Pt(10)
                                title_run.font.bold = True
                                date_run = title_para.add_run(f'\t{date_range}')
                                date_run.font.size = Pt(9)
                                date_run.font.italic = True
                            else:
                                # Regular bullet - strip all bullet markers
                                clean_text = strip_bullet_markers(bullet_text)
                                if clean_text:
                                    bullet_para = left_cell.add_paragraph()
                                    bullet_para.style = "List Bullet"
                                    run = bullet_para.add_run(clean_text)
                                    run.font.size = Pt(10)
                    elif is_skill_section:
                        # Skills section - comma-separated, no bullets
                        skill_items = []
                        for b in s.bullets:
                            if b.text.strip():
                                bullet_text = apply_replacements(b.text, replacements)
                                clean_text = strip_bullet_markers(bullet_text)
                                if clean_text:
                                    skill_items.append(clean_text)
                        if skill_items:
                            skills_para = left_cell.add_paragraph(", ".join(skill_items))
                            skills_para.runs[0].font.size = Pt(10)
                    else:
                        # Regular section with bullets
                        for b in s.bullets:
                            if not b.text.strip():
                                continue
                            bullet_text = apply_replacements(b.text, replacements)
                            # Strip all bullet markers
                            clean_text = strip_bullet_markers(bullet_text)
                            if clean_text:
                                bullet_para = left_cell.add_paragraph()
                                bullet_para.style = "List Bullet"
                                run = bullet_para.add_run(clean_text)
                                run.font.size = Pt(10)

                left_cell.add_paragraph()

            # Add sections to right column
            for s in right_sections:
                section_title = apply_replacements(s.title, replacements)
                if template_style["styles"]["section_uppercase"]:
                    section_title = section_title.upper()

                heading_para = right_cell.add_paragraph()
                heading_run = heading_para.add_run(section_title)
                heading_run.font.size = Pt(12)
                heading_run.font.bold = True
                heading_run.font.name = (
                    "Arial"
                    if "Arial" in template_style["styles"]["font"]
                    else "Georgia"
                )

                # Check section type
                section_lower = s.title.lower()
                is_work_experience = (
                    "experience" in section_lower
                    or "work" in section_lower
                    or "employment" in section_lower
                )
                is_skill_section = (
                    "skill" in section_lower
                    or "technical" in section_lower
                    or "technology" in section_lower
                    or "competencies" in section_lower
                    or "expertise" in section_lower
                    or "proficiencies" in section_lower
                )

                # Create content for this section
                if s.bullets:
                    if is_work_experience:
                        # Work experience - handle company headers
                        for b in s.bullets:
                            if not b.text.strip():
                                continue
                            bullet_text = apply_replacements(b.text, replacements)
                            
                            # Check if company header
                            if bullet_text.startswith("**") and "**" in bullet_text[2:]:
                                header_text = bullet_text.replace("**", "").strip()
                                parts = header_text.split(' / ')
                                company_name = parts[0] if parts else ''
                                location = parts[1] if len(parts) >= 4 else ''
                                title = parts[2] if len(parts) >= 4 else (parts[1] if len(parts) >= 2 else '')
                                date_range = parts[3] if len(parts) >= 4 else (parts[2] if len(parts) >= 3 else '')
                                
                                # Company header - Line 1
                                company_para = right_cell.add_paragraph()
                                company_line = company_name
                                if location:
                                    company_line += f' / {location}'
                                company_run = company_para.add_run(company_line)
                                company_run.font.size = Pt(11)
                                company_run.font.bold = True
                                
                                # Company header - Line 2
                                title_para = right_cell.add_paragraph()
                                title_run = title_para.add_run(title)
                                title_run.font.size = Pt(10)
                                title_run.font.bold = True
                                date_run = title_para.add_run(f'\t{date_range}')
                                date_run.font.size = Pt(9)
                                date_run.font.italic = True
                            else:
                                # Regular bullet - strip existing bullets
                                clean_text = bullet_text.replace("•", "").replace("*", "").replace("-", "").strip()
                                clean_text = clean_text.lstrip('•*- ').strip()
                                if clean_text:
                                    bullet_para = right_cell.add_paragraph()
                                    bullet_para.style = "List Bullet"
                                    run = bullet_para.add_run(clean_text)
                                    run.font.size = Pt(10)
                    elif is_skill_section:
                        # Skills section - comma-separated, no bullets
                        skill_items = []
                        for b in s.bullets:
                            if b.text.strip():
                                bullet_text = apply_replacements(b.text, replacements)
                                clean_text = bullet_text.replace("•", "").replace("*", "").replace("-", "").strip()
                                clean_text = clean_text.lstrip('•*- ').strip()
                                if clean_text:
                                    skill_items.append(clean_text)
                        if skill_items:
                            skills_para = right_cell.add_paragraph(", ".join(skill_items))
                            skills_para.runs[0].font.size = Pt(10)
                    else:
                        # Regular section with bullets
                        for b in s.bullets:
                            if not b.text.strip():
                                continue
                            bullet_text = apply_replacements(b.text, replacements)
                            # Strip existing bullets
                            clean_text = bullet_text.replace("•", "").replace("*", "").replace("-", "").strip()
                            clean_text = clean_text.lstrip('•*- ').strip()
                            if clean_text:
                                bullet_para = right_cell.add_paragraph()
                                bullet_para.style = "List Bullet"
                                run = bullet_para.add_run(clean_text)
                                run.font.size = Pt(10)

                right_cell.add_paragraph()
        else:
            # Single column layout
            if payload.summary:
                summary_para = doc.add_paragraph(
                    apply_replacements(payload.summary, replacements)
                )
                summary_para.runs[0].font.size = Pt(10)
                doc.add_paragraph()

            for s in payload.sections:
                section_title = apply_replacements(s.title, replacements)
                if template_style["styles"]["section_uppercase"]:
                    section_title = section_title.upper()

                heading_para = doc.add_paragraph()
                heading_run = heading_para.add_run(section_title)
                heading_run.font.size = Pt(12)
                heading_run.font.bold = True
                heading_run.font.name = (
                    "Arial"
                    if "Arial" in template_style["styles"]["font"]
                    else "Georgia"
                )

                # Check section type
                section_lower = s.title.lower()
                is_work_experience = (
                    "experience" in section_lower
                    or "work" in section_lower
                    or "employment" in section_lower
                )
                is_skill_section = (
                    "skill" in section_lower
                    or "technical" in section_lower
                    or "technology" in section_lower
                    or "competencies" in section_lower
                    or "expertise" in section_lower
                    or "proficiencies" in section_lower
                )

                # Create content for this section
                if s.bullets:
                    if is_work_experience:
                        # Work experience - handle company headers
                        for b in s.bullets:
                            if not b.text.strip():
                                continue
                            bullet_text = apply_replacements(b.text, replacements)
                            
                            # Check if company header
                            if bullet_text.startswith("**") and "**" in bullet_text[2:]:
                                header_text = bullet_text.replace("**", "").strip()
                                parts = header_text.split(' / ')
                                company_name = parts[0] if parts else ''
                                location = parts[1] if len(parts) >= 4 else ''
                                title = parts[2] if len(parts) >= 4 else (parts[1] if len(parts) >= 2 else '')
                                date_range = parts[3] if len(parts) >= 4 else (parts[2] if len(parts) >= 3 else '')
                                
                                # Company header - Line 1
                                company_para = doc.add_paragraph()
                                company_line = company_name
                                if location:
                                    company_line += f' / {location}'
                                company_run = company_para.add_run(company_line)
                                company_run.font.size = Pt(11)
                                company_run.font.bold = True
                                
                                # Company header - Line 2
                                title_para = doc.add_paragraph()
                                title_run = title_para.add_run(title)
                                title_run.font.size = Pt(10)
                                title_run.font.bold = True
                                date_run = title_para.add_run(f'\t{date_range}')
                                date_run.font.size = Pt(9)
                                date_run.font.italic = True
                            else:
                                # Regular bullet - strip existing bullets
                                clean_text = bullet_text.replace("•", "").replace("*", "").replace("-", "").strip()
                                clean_text = clean_text.lstrip('•*- ').strip()
                                if clean_text:
                                    bullet_para = doc.add_paragraph()
                                    bullet_para.style = "List Bullet"
                                    run = bullet_para.add_run(clean_text)
                                    run.font.size = Pt(10)
                    elif is_skill_section:
                        # Skills section - comma-separated, no bullets
                        skill_items = []
                        for b in s.bullets:
                            if b.text.strip():
                                bullet_text = apply_replacements(b.text, replacements)
                                clean_text = bullet_text.replace("•", "").replace("*", "").replace("-", "").strip()
                                clean_text = clean_text.lstrip('•*- ').strip()
                                if clean_text:
                                    skill_items.append(clean_text)
                        if skill_items:
                            skills_para = doc.add_paragraph(", ".join(skill_items))
                            skills_para.runs[0].font.size = Pt(10)
                    else:
                        # Regular section with bullets
                        for b in s.bullets:
                            if not b.text.strip():
                                continue
                            bullet_text = apply_replacements(b.text, replacements)
                            # Strip existing bullets
                            clean_text = bullet_text.replace("•", "").replace("*", "").replace("-", "").strip()
                            clean_text = clean_text.lstrip('•*- ').strip()
                            if clean_text:
                                bullet_para = doc.add_paragraph()
                                bullet_para.style = "List Bullet"
                                run = bullet_para.add_run(clean_text)
                                run.font.size = Pt(10)

                doc.add_paragraph()

        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)

        docx_bytes = buffer.getvalue()
        logger.info(f"DOCX generated successfully, size: {len(docx_bytes)} bytes")

        # Track export analytics
        if user_email and db:
            try:
                user = db.query(User).filter(User.email == user_email).first()
                if user:
                    # Find or create resume record
                    resume = (
                        db.query(Resume)
                        .filter(Resume.user_id == user.id, Resume.name == payload.name)
                        .first()
                    )

                    if not resume:
                        resume = Resume(
                            user_id=user.id,
                            name=payload.name,
                            title=payload.title,
                            email=payload.email,
                            phone=payload.phone,
                            location=payload.location,
                            summary=payload.summary,
                            template=template_id,
                        )
                        db.add(resume)
                        db.commit()
                        db.refresh(resume)

                    # Create export analytics record
                    export_analytics = ExportAnalytics(
                        user_id=user.id,
                        resume_id=resume.id,
                        export_format="docx",
                        template_used=template_id,
                        file_size=len(docx_bytes),
                        export_success=True,
                    )
                    db.add(export_analytics)
                    db.commit()

                    logger.info(
                        f"Export analytics tracked for user {user_email}: DOCX export"
                    )
            except Exception as e:
                logger.error(f"Failed to track export analytics: {e}")

        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=resume.docx"},
        )
    except Exception as e:
        logger.error(f"DOCX export error: {str(e)}")
        import traceback

        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

