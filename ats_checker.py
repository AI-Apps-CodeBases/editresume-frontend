import re
import math
from typing import Dict, List, Tuple, Optional
from collections import Counter

# Try to import optional dependencies with fallbacks
try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize
    
    # Download required NLTK data
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt')

    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords')
    
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False
    # Fallback tokenization
    def word_tokenize(text):
        return text.split()
    
    stopwords = set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False

class ATSChecker:
    def __init__(self):
        self.required_sections = {
            'contact': ['name', 'email', 'phone', 'location'],
            'summary': ['summary', 'objective', 'profile'],
            'experience': ['experience', 'work', 'employment', 'career'],
            'education': ['education', 'academic', 'degree'],
            'skills': ['skills', 'technical', 'competencies']
        }
        
        self.ats_keywords = {
            'action_verbs': [
                'achieved', 'accomplished', 'administered', 'analyzed', 'built', 'collaborated',
                'created', 'delivered', 'developed', 'executed', 'implemented', 'improved',
                'increased', 'led', 'managed', 'optimized', 'produced', 'reduced', 'resolved',
                'streamlined', 'transformed', 'utilized'
            ],
            'technical_terms': [
                'api', 'database', 'framework', 'algorithm', 'architecture', 'automation',
                'cloud', 'deployment', 'integration', 'optimization', 'scalability', 'security'
            ],
            'metrics': [
                'percent', '%', 'increase', 'decrease', 'reduction', 'improvement',
                'efficiency', 'performance', 'cost', 'revenue', 'profit'
            ]
        }
        
        # Initialize spaCy model
        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except OSError:
                print("spaCy model not found. Install with: python -m spacy download en_core_web_sm")
                self.nlp = None
        else:
            self.nlp = None
        
        if NLTK_AVAILABLE:
            self.stop_words = set(stopwords.words('english'))
        else:
            self.stop_words = set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
        
        if SKLEARN_AVAILABLE:
            self.vectorizer = TfidfVectorizer(
                max_features=1000,
                stop_words='english',
                ngram_range=(1, 2)
            )
        else:
            self.vectorizer = None

    def extract_text_from_resume(self, resume_data: Dict) -> str:
        """Extract all text content from resume data"""
        text_parts = []
        
        # Handle both dict and Pydantic model formats
        def get_value(obj, key, default=''):
            if hasattr(obj, key):
                return getattr(obj, key, default)
            elif isinstance(obj, dict):
                return obj.get(key, default)
            return default
        
        # Add basic info
        name = get_value(resume_data, 'name')
        if name:
            text_parts.append(name)
            
        title = get_value(resume_data, 'title')
        if title:
            text_parts.append(title)
            
        summary = get_value(resume_data, 'summary')
        if summary:
            text_parts.append(summary)
        
        # Add sections
        sections = get_value(resume_data, 'sections', [])
        for section in sections:
            section_title = get_value(section, 'title')
            if section_title:
                text_parts.append(section_title)
                
            bullets = get_value(section, 'bullets', [])
            for bullet in bullets:
                bullet_text = get_value(bullet, 'text')
                if bullet_text:
                    text_parts.append(bullet_text)
        
        return ' '.join(text_parts)

    def check_required_sections(self, resume_data: Dict) -> Dict[str, any]:
        """Check if required sections are present"""
        found_sections = {}
        missing_sections = []
        
        # Handle both dict and Pydantic model formats
        def get_value(obj, key, default=''):
            if hasattr(obj, key):
                return getattr(obj, key, default)
            elif isinstance(obj, dict):
                return obj.get(key, default)
            return default
        
        text_content = self.extract_text_from_resume(resume_data).lower()
        
        # More flexible section detection
        for section_type, keywords in self.required_sections.items():
            found = False
            
            # Check for section titles in the resume data
            sections = get_value(resume_data, 'sections', [])
            for section in sections:
                section_title = get_value(section, 'title', '').lower()
                for keyword in keywords:
                    if keyword in section_title:
                        found = True
                        break
                if found:
                    break
            
            # Also check in text content
            if not found:
                for keyword in keywords:
                    if keyword in text_content:
                        found = True
                        break
            
            found_sections[section_type] = found
            if not found:
                missing_sections.append(section_type)
        
        # More generous scoring - give points for having any content
        base_score = 2  # Start with 2 points for having resume data
        found_count = sum(1 for found in found_sections.values() if found)
        section_score = base_score + found_count * 2  # 2 points per found section
        
        return {
            'found_sections': found_sections,
            'missing_sections': missing_sections,
            'section_score': min(5, section_score)  # Cap at 5 sections
        }

    def analyze_keyword_density(self, resume_text: str) -> Dict[str, any]:
        """Analyze keyword density and relevance"""
        if not resume_text.strip():
            return {'score': 0, 'suggestions': ['Add content to your resume']}
        
        # Simple word splitting for fallback
        words = resume_text.lower().split()
        words = [word.strip('.,!?;:"()[]{}') for word in words if word.isalpha()]
        
        if not words:
            return {'score': 0, 'suggestions': ['Add meaningful content to your resume']}
        
        # Count keyword occurrences
        action_verb_count = sum(1 for word in words if word in self.ats_keywords['action_verbs'])
        technical_count = sum(1 for word in words if word in self.ats_keywords['technical_terms'])
        metrics_count = sum(1 for word in words if word in self.ats_keywords['metrics'])
        
        total_words = len(words)
        
        # Calculate densities
        action_density = (action_verb_count / total_words) * 100 if total_words > 0 else 0
        technical_density = (technical_count / total_words) * 100 if total_words > 0 else 0
        metrics_density = (metrics_count / total_words) * 100 if total_words > 0 else 0
        
        # Generate suggestions
        suggestions = []
        if action_density < 1:
            suggestions.append("Add more action verbs (achieved, developed, implemented)")
        if technical_density < 0.5:
            suggestions.append("Include more technical keywords relevant to your field")
        if metrics_density < 0.3:
            suggestions.append("Add quantifiable metrics and achievements")
        
        # More generous scoring
        base_score = 50  # Start with a base score
        action_bonus = min(30, action_density * 3)
        technical_bonus = min(20, technical_density * 4)
        metrics_bonus = min(20, metrics_density * 5)
        
        keyword_score = min(100, base_score + action_bonus + technical_bonus + metrics_bonus)
        
        return {
            'score': keyword_score,
            'action_verbs': action_verb_count,
            'technical_terms': technical_count,
            'metrics': metrics_count,
            'action_density': action_density,
            'technical_density': technical_density,
            'metrics_density': metrics_density,
            'suggestions': suggestions
        }

    def check_formatting_issues(self, resume_data: Dict) -> Dict[str, any]:
        """Check for common ATS formatting issues"""
        issues = []
        suggestions = []
        
        text_content = self.extract_text_from_resume(resume_data)
        
        # Check for special characters that might confuse ATS
        if re.search(r'[^\w\s@.-]', text_content):
            issues.append('special_characters')
            suggestions.append('Remove special characters and symbols')
        
        # Check for headers/tables (basic check)
        if '|' in text_content or '---' in text_content:
            issues.append('table_formatting')
            suggestions.append('Avoid table formatting - use simple text layout')
        
        # Check for very long lines
        lines = text_content.split('\n')
        long_lines = [line for line in lines if len(line) > 80]
        if long_lines:
            issues.append('long_lines')
            suggestions.append('Keep lines under 80 characters for better ATS parsing')
        
        # Check for missing contact info
        if not re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text_content):
            issues.append('missing_email')
            suggestions.append('Include a professional email address')
        
        if not re.search(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text_content):
            issues.append('missing_phone')
            suggestions.append('Include a phone number')
        
        formatting_score = max(0, 100 - len(issues) * 20)
        
        return {
            'score': formatting_score,
            'issues': issues,
            'suggestions': suggestions
        }

    def calculate_overall_score(self, resume_data: Dict) -> Dict[str, any]:
        """Calculate overall ATS compatibility score"""
        resume_text = self.extract_text_from_resume(resume_data)
        
        # Get individual scores
        section_analysis = self.check_required_sections(resume_data)
        keyword_analysis = self.analyze_keyword_density(resume_text)
        formatting_analysis = self.check_formatting_issues(resume_data)
        
        # More generous scoring
        section_score = min(100, section_analysis['section_score'] * 20)  # Max 100
        keyword_score = keyword_analysis['score']
        formatting_score = formatting_analysis['score']
        
        # Weight the scores more evenly
        overall_score = (
            section_score * 0.4 +
            keyword_score * 0.3 +
            formatting_score * 0.3
        )
        
        # Ensure minimum score if resume has content
        if resume_text.strip():
            overall_score = max(30, overall_score)  # Minimum 30 if there's content
        
        # Compile all suggestions
        all_suggestions = []
        all_suggestions.extend(keyword_analysis.get('suggestions', []))
        all_suggestions.extend(formatting_analysis.get('suggestions', []))
        
        if section_analysis['missing_sections']:
            all_suggestions.append(f"Add missing sections: {', '.join(section_analysis['missing_sections'])}")
        
        return {
            'overall_score': min(100, max(0, int(overall_score))),
            'section_analysis': section_analysis,
            'keyword_analysis': keyword_analysis,
            'formatting_analysis': formatting_analysis,
            'suggestions': list(set(all_suggestions))  # Remove duplicates
        }

    def get_ats_score(self, resume_data: Dict) -> Dict[str, any]:
        """Main method to get ATS compatibility score and suggestions"""
        try:
            result = self.calculate_overall_score(resume_data)
            return {
                'success': True,
                'score': result['overall_score'],
                'details': result,
                'suggestions': result['suggestions']
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'score': 0,
                'suggestions': ['Unable to analyze resume. Please check your content.']
            }
