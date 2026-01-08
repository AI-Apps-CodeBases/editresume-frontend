"""ATS service modules - extracted from monolithic EnhancedATSChecker.

These modules provide focused, testable components:
- text_extractor: Extracts text from resume data
- structure_analyzer: Analyzes resume structure
- tfidf_calculator: Calculates TF-IDF cosine similarity scores
"""

from app.services.ats.structure_analyzer import analyze_resume_structure
from app.services.ats.text_extractor import extract_text_from_resume
from app.services.ats.tfidf_calculator import calculate_tfidf_cosine_score

__all__ = [
    "extract_text_from_resume",
    "analyze_resume_structure",
    "calculate_tfidf_cosine_score",
]

