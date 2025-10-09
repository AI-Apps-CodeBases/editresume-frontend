from fastapi import FastAPI, UploadFile, File
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import re
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="editresume.io API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BulletParam(BaseModel):
    text: str
    metric: Optional[str] = None
    tool: Optional[str] = None
    tense: Optional[str] = "past"

class Section(BaseModel):
    title: str
    bullets: List[BulletParam] = []

class ResumePayload(BaseModel):
    name: str
    title: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    sections: List[Section] = []
    variant: Optional[str] = None

class ExportPayload(BaseModel):
    name: str
    title: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    sections: List[Section] = []
    replacements: Optional[Dict[str, str]] = None
    template: Optional[str] = "clean"

@app.get("/health")
async def health():
    return {"status": "ok", "db": os.getenv("DATABASE_URL", "unset")}

TEMPLATES = {
    "clean": {
        "name": "Clean (ATS)",
        "styles": {
            "header_align": "center",
            "header_border": "2px solid #333",
            "font": "Georgia, serif",
            "section_uppercase": True,
            "layout": "single"
        }
    },
    "modern": {
        "name": "Modern",
        "styles": {
            "header_align": "left",
            "header_border": "none",
            "font": "Arial, sans-serif",
            "section_uppercase": False,
            "layout": "single"
        }
    },
    "minimal": {
        "name": "Minimal",
        "styles": {
            "header_align": "left",
            "header_border": "1px solid #eee",
            "font": "Helvetica, sans-serif",
            "section_uppercase": False,
            "layout": "single"
        }
    },
    "two-column": {
        "name": "Two Column",
        "styles": {
            "header_align": "center",
            "header_border": "1px solid #333",
            "font": "Arial, sans-serif",
            "section_uppercase": False,
            "layout": "two-column"
        }
    },
    "compact": {
        "name": "Compact",
        "styles": {
            "header_align": "center",
            "header_border": "1px solid #333",
            "font": "Arial, sans-serif",
            "section_uppercase": True,
            "layout": "single"
        }
    }
}

@app.get("/api/resume/templates")
async def get_templates():
    return {
        "templates": [
            {"id": tid, "name": t["name"]} for tid, t in TEMPLATES.items()
        ]
    }

@app.post("/api/resume/parse-text")
async def parse_text(payload: dict):
    try:
        text = payload.get("text", "")
        
        if not text.strip():
            return {"success": False, "error": "No text provided"}
        
        logger.info(f"Parsing text: {len(text)} characters")
        parsed_data = parse_resume_text(text)
        
        return {
            "success": True,
            "data": parsed_data
        }
    except Exception as e:
        logger.error(f"Text parsing error: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/api/resume/preview")
async def preview_resume(payload: ResumePayload):
    assembled = f"{payload.name} — {payload.title}\n\n"
    if payload.summary:
        assembled += payload.summary + "\n\n"
    for s in payload.sections:
        assembled += s.title + "\n"
        for b in s.bullets:
            extra = []
            if b.metric: extra.append(b.metric)
            if b.tool: extra.append(b.tool)
            meta = f" ({', '.join(extra)})" if extra else ""
            assembled += f"• {b.text}{meta}\n"
        assembled += "\n"
    return {"variant": payload.variant or "default", "preview_text": assembled}

def apply_replacements(text: str, replacements: Dict[str, str]) -> str:
    for key, value in replacements.items():
        text = text.replace(key, value)
    return text

@app.post("/api/resume/export/pdf")
async def export_pdf(payload: ExportPayload):
    try:
        from weasyprint import HTML, CSS
        from io import BytesIO
        
        replacements = payload.replacements or {}
        template_id = payload.template or "clean"
        template_style = TEMPLATES.get(template_id, TEMPLATES["clean"])
        
        logger.info(f"Exporting PDF with template: {template_id}")
        
        font_family = template_style["styles"]["font"]
        header_align = template_style["styles"]["header_align"]
        header_border = template_style["styles"]["header_border"]
        section_uppercase = "text-transform: uppercase;" if template_style["styles"]["section_uppercase"] else ""
        layout = template_style["styles"]["layout"]
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                @page {{ size: A4; margin: 2cm; }}
                body {{ font-family: {font_family}; font-size: 11pt; line-height: 1.4; color: #333; }}
                .header {{ text-align: {header_align}; border-bottom: {header_border}; padding-bottom: 10px; margin-bottom: 15px; }}
                .header h1 {{ margin: 0; font-size: 24pt; font-weight: bold; }}
                .header .title {{ font-size: 14pt; margin: 5px 0; color: #555; }}
                .header .contact {{ font-size: 10pt; color: #666; margin-top: 5px; }}
                .summary {{ margin-bottom: 15px; font-size: 10pt; line-height: 1.5; }}
                .section {{ margin-bottom: 15px; }}
                .section h2 {{ font-size: 12pt; font-weight: bold; {section_uppercase}
                               border-bottom: 1px solid #333; padding-bottom: 3px; margin-bottom: 8px; }}
                .section ul {{ margin: 0; padding-left: 20px; list-style-type: disc; }}
                .section li {{ margin-bottom: 6px; font-size: 10pt; }}
                .two-column {{ display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }}
                .column {{ }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>{apply_replacements(payload.name, replacements)}</h1>
                <div class="title">{apply_replacements(payload.title, replacements)}</div>
                <div class="contact">
                    {apply_replacements(payload.email or '', replacements)}
                    {' • ' + apply_replacements(payload.phone or '', replacements) if payload.phone else ''}
                    {' • ' + apply_replacements(payload.location or '', replacements) if payload.location else ''}
                </div>
            </div>
            
            {f'<div class="summary">{apply_replacements(payload.summary, replacements)}</div>' if payload.summary and layout != 'two-column' else ''}
            
            {f'''
            <div class="two-column">
                <div class="column">
                    {f'<div class="section"><h2>Professional Summary</h2><div class="summary">{apply_replacements(payload.summary, replacements)}</div></div>' if payload.summary else ''}
                    {''.join([f'''
                    <div class="section">
                        <h2>{apply_replacements(s.title, replacements)}</h2>
                        <ul>
                            {''.join([f'<li>{apply_replacements(b.text, replacements)}</li>' for b in s.bullets])}
                        </ul>
                    </div>
                    ''' for i, s in enumerate(payload.sections) if i % 2 == 0])}
                </div>
                <div class="column">
                    {''.join([f'''
                    <div class="section">
                        <h2>{apply_replacements(s.title, replacements)}</h2>
                        <ul>
                            {''.join([f'<li>{apply_replacements(b.text, replacements)}</li>' for b in s.bullets])}
                        </ul>
                    </div>
                    ''' for i, s in enumerate(payload.sections) if i % 2 == 1])}
                </div>
            </div>
            ''' if layout == 'two-column' else ''.join([f'''
            <div class="section">
                <h2>{apply_replacements(s.title, replacements)}</h2>
                <ul>
                    {''.join([f'<li>{apply_replacements(b.text, replacements)}</li>' for b in s.bullets])}
                </ul>
            </div>
            ''' for s in payload.sections])}
        </body>
        </html>
        """
        
        pdf_bytes = HTML(string=html_content).write_pdf()
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=resume.pdf"}
        )
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/resume/upload")
async def upload_resume(file: UploadFile = File(...)):
    try:
        from io import BytesIO
        
        contents = await file.read()
        filename = file.filename if file.filename else 'unknown'
        file_type = filename.split('.')[-1].lower() if '.' in filename else ''
        
        logger.info(f"Upload: filename={filename}, type={file_type}, content_type={file.content_type}, size={len(contents)}")
        
        magic_bytes = contents[:4]
        is_docx = magic_bytes == b'PK\x03\x04'
        is_pdf = contents[:5] == b'%PDF-'
        
        logger.info(f"File magic: is_docx={is_docx}, is_pdf={is_pdf}")
        
        text = ""
        actual_type = ""
        
        if is_docx or file_type in ['docx', 'doc'] or 'wordprocessingml' in str(file.content_type):
            logger.info("Processing as DOCX")
            actual_type = "DOCX"
            try:
                from docx import Document
                from docx.oxml.text.paragraph import CT_P
                from docx.oxml.table import CT_Tbl
                from docx.table import _Cell, Table
                from docx.text.paragraph import Paragraph
                
                docx_file = BytesIO(contents)
                doc = Document(docx_file)
                
                def extract_text_from_element(element):
                    elem_text = ""
                    if isinstance(element, Paragraph):
                        if element.text.strip():
                            elem_text += element.text + "\n"
                    elif isinstance(element, Table):
                        for row in element.rows:
                            for cell in row.cells:
                                for para in cell.paragraphs:
                                    if para.text.strip():
                                        elem_text += para.text + "\n"
                    return elem_text
                
                for element in doc.element.body:
                    if isinstance(element, CT_P):
                        para = Paragraph(element, doc)
                        if para.text.strip():
                            text += para.text + "\n"
                    elif isinstance(element, CT_Tbl):
                        table = Table(element, doc)
                        for row in table.rows:
                            for cell in row.cells:
                                for para in cell.paragraphs:
                                    if para.text.strip():
                                        text += para.text + "\n"
                
                for section in doc.sections:
                    if section.header:
                        for para in section.header.paragraphs:
                            if para.text.strip():
                                text += para.text + "\n"
                    if section.footer:
                        for para in section.footer.paragraphs:
                            if para.text.strip():
                                text += para.text + "\n"
                
                logger.info(f"DOCX extracted {len(text)} characters from {len(doc.paragraphs)} paragraphs")
            except Exception as docx_error:
                logger.error(f"DOCX error: {str(docx_error)}")
                return {
                    "success": False,
                    "error": f"Could not read DOCX file: {str(docx_error)}"
                }
        
        elif is_pdf or file_type == 'pdf' or file.content_type == 'application/pdf':
            logger.info("Processing as PDF")
            actual_type = "PDF"
            try:
                import pdfplumber
                pdf_file = BytesIO(contents)
                with pdfplumber.open(pdf_file) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                
                logger.info(f"PDF extracted {len(text)} characters")
            except Exception as pdf_error:
                error_msg = str(pdf_error)
                logger.error(f"PDF error: {error_msg}")
                if "Root object" in error_msg or "really a PDF" in error_msg:
                    return {
                        "success": False,
                        "error": "PDF file appears to be corrupted or invalid. Try:\n1. Re-saving the PDF from its original application\n2. Converting to DOCX first\n3. Or use manual entry"
                    }
                raise
        
        else:
            logger.warning(f"Unsupported file type: {file_type}")
            return {
                "success": False,
                "error": f"Unsupported file type: {file_type}. Please upload PDF or DOCX."
            }
        
        if not text.strip():
            logger.warning(f"No text extracted from {actual_type} file")
            return {
                "success": False,
                "error": f"Could not extract text from {actual_type} file. The file might be:\n• Empty\n• Using special formatting (text boxes)\n• Password protected\n\nPlease try exporting from Word as a new DOCX, or use manual entry."
            }
        
        parsed_data = parse_resume_text(text)
        
        return {
            "success": True,
            "data": parsed_data,
            "raw_text": text[:1000],
            "debug": {
                "file_type": file_type,
                "text_length": len(text),
                "has_content": bool(text.strip())
            }
        }
    except Exception as e:
        return {"success": False, "error": f"Upload failed: {str(e)}"}

def parse_resume_text(text: str) -> Dict:
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    data = {
        "name": "",
        "title": "",
        "email": "",
        "phone": "",
        "location": "",
        "summary": "",
        "sections": [],
        "detected_variables": {}
    }
    
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    if email_match:
        data["email"] = email_match.group()
    
    phone_match = re.search(r'[\+\(]?[0-9][0-9 .\-\(\)]{8,}[0-9]', text)
    if phone_match:
        data["phone"] = phone_match.group()
    
    if lines:
        data["name"] = lines[0]
        if len(lines) > 1:
            data["title"] = lines[1]
    
    section_headers = ['experience', 'education', 'skills', 'projects', 'certifications', 'summary']
    current_section = None
    current_bullets = []
    summary_lines = []
    
    for i, line in enumerate(lines[2:], start=2):
        line_lower = line.lower()
        
        if any(header in line_lower for header in section_headers):
            if current_section:
                data["sections"].append({
                    "id": str(len(data["sections"])),
                    "title": current_section,
                    "bullets": [{"id": str(j), "text": b, "params": {}} for j, b in enumerate(current_bullets)]
                })
            current_section = line
            current_bullets = []
        elif current_section:
            if line.startswith('•') or line.startswith('-') or line.startswith('*'):
                bullet_text = re.sub(r'^[•\-\*]\s*', '', line)
                current_bullets.append(bullet_text)
            elif len(line) > 20 and not any(header in line_lower for header in section_headers):
                current_bullets.append(line)
        elif 'summary' in line_lower:
            pass
        elif not current_section and len(line) > 30:
            summary_lines.append(line)
    
    if current_section:
        data["sections"].append({
            "id": str(len(data["sections"])),
            "title": current_section,
            "bullets": [{"id": str(j), "text": b, "params": {}} for j, b in enumerate(current_bullets)]
        })
    
    if summary_lines:
        data["summary"] = " ".join(summary_lines)
    
    data["detected_variables"] = detect_parameterization(text)
    
    return data

def detect_parameterization(text: str) -> Dict[str, str]:
    variables = {}
    
    companies = re.findall(r'\b(?:at|for|with)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\b', text)
    if companies:
        most_common = max(set(companies), key=companies.count)
        variables["{{company}}"] = most_common
    
    percentages = re.findall(r'(\d+)%', text)
    if percentages:
        variables["{{metric}}"] = percentages[0]
    
    tech_keywords = ['AWS', 'Azure', 'GCP', 'Kubernetes', 'Docker', 'Python', 'Java', 'React', 'Node.js']
    found_tech = [tech for tech in tech_keywords if tech in text]
    if found_tech:
        variables["{{tech}}"] = found_tech[0]
    
    return variables

@app.post("/api/resume/export/docx")
async def export_docx(payload: ExportPayload):
    try:
        from docx import Document
        from docx.shared import Pt, Inches, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from io import BytesIO
        
        replacements = payload.replacements or {}
        template_id = payload.template or "clean"
        template_style = TEMPLATES.get(template_id, TEMPLATES["clean"])
        
        logger.info(f"Exporting DOCX with template: {template_id}")
        logger.info(f"Template layout: {template_style['styles']['layout']}")
        
        layout = template_style["styles"]["layout"]
        
        doc = Document()
        
        section = doc.sections[0]
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
        name_para = doc.add_paragraph()
        name_run = name_para.add_run(apply_replacements(payload.name, replacements))
        name_run.font.size = Pt(18)
        name_run.font.bold = True
        name_run.font.name = 'Arial' if 'Arial' in template_style["styles"]["font"] else 'Georgia'
        if template_style["styles"]["header_align"] == "center":
            name_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        title_para = doc.add_paragraph()
        title_run = title_para.add_run(apply_replacements(payload.title, replacements))
        title_run.font.size = Pt(12)
        title_run.font.name = 'Arial' if 'Arial' in template_style["styles"]["font"] else 'Georgia'
        if template_style["styles"]["header_align"] == "center":
            title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        contact_parts = []
        if payload.email:
            contact_parts.append(apply_replacements(payload.email, replacements))
        if payload.phone:
            contact_parts.append(apply_replacements(payload.phone, replacements))
        if payload.location:
            contact_parts.append(apply_replacements(payload.location, replacements))
        
        if contact_parts:
            contact_para = doc.add_paragraph(' • '.join(contact_parts))
            contact_para.runs[0].font.size = Pt(10)
            if template_style["styles"]["header_align"] == "center":
                contact_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        doc.add_paragraph()
        
        logger.info(f"Layout decision: {layout == 'two-column'}")
        if layout == 'two-column':
            # Create a table for two-column layout
            table = doc.add_table(rows=1, cols=2)
            table.autofit = False
            table.allow_autofit = False
            
            # Set column widths
            table.columns[0].width = Inches(3.2)
            table.columns[1].width = Inches(3.2)
            
            # Left column
            left_cell = table.cell(0, 0)
            left_paragraphs = left_cell.paragraphs
            left_paragraphs[0].clear()
            
            # Right column  
            right_cell = table.cell(0, 1)
            right_paragraphs = right_cell.paragraphs
            right_paragraphs[0].clear()
            
            # Add Professional Summary to left column
            if payload.summary:
                summary_para = left_paragraphs[0]
                summary_run = summary_para.add_run("Professional Summary")
                summary_run.font.size = Pt(12)
                summary_run.font.bold = True
                summary_run.font.name = 'Arial' if 'Arial' in template_style["styles"]["font"] else 'Georgia'
                
                summary_text_para = left_cell.add_paragraph()
                summary_text_run = summary_text_para.add_run(apply_replacements(payload.summary, replacements))
                summary_text_run.font.size = Pt(10)
                left_cell.add_paragraph()
            
            # Distribute sections between columns
            left_sections = [s for i, s in enumerate(payload.sections) if i % 2 == 0]
            right_sections = [s for i, s in enumerate(payload.sections) if i % 2 == 1]
            
            # Add sections to left column
            for s in left_sections:
                section_title = apply_replacements(s.title, replacements)
                if template_style["styles"]["section_uppercase"]:
                    section_title = section_title.upper()
                
                heading_para = left_cell.add_paragraph()
                heading_run = heading_para.add_run(section_title)
                heading_run.font.size = Pt(12)
                heading_run.font.bold = True
                heading_run.font.name = 'Arial' if 'Arial' in template_style["styles"]["font"] else 'Georgia'
                
                for b in s.bullets:
                    bullet_para = left_cell.add_paragraph(apply_replacements(b.text, replacements), style='List Bullet')
                    bullet_para.runs[0].font.size = Pt(10)
                
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
                heading_run.font.name = 'Arial' if 'Arial' in template_style["styles"]["font"] else 'Georgia'
                
                for b in s.bullets:
                    bullet_para = right_cell.add_paragraph(apply_replacements(b.text, replacements), style='List Bullet')
                    bullet_para.runs[0].font.size = Pt(10)
                
                right_cell.add_paragraph()
        else:
            # Single column layout
            if payload.summary:
                summary_para = doc.add_paragraph(apply_replacements(payload.summary, replacements))
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
                heading_run.font.name = 'Arial' if 'Arial' in template_style["styles"]["font"] else 'Georgia'
                
                for b in s.bullets:
                    bullet_para = doc.add_paragraph(apply_replacements(b.text, replacements), style='List Bullet')
                    bullet_para.runs[0].font.size = Pt(10)
                
                doc.add_paragraph()
        
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        
        return Response(
            content=buffer.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=resume.docx"}
        )
    except Exception as e:
        return {"error": str(e)}

