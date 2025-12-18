import re
import math
import json
import logging
import asyncio
from typing import Dict, List, Tuple, Optional, Any
from collections import Counter
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Try to import optional dependencies with fallbacks
try:
    import nltk
    from nltk.corpus import stopwords

    # NLTK data should be pre-downloaded in Dockerfile for faster deployment
    # Only download if not found (shouldn't happen in production)
    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        logger.warning("NLTK punkt not found, downloading... (should be pre-downloaded in Dockerfile)")
        nltk.download("punkt", quiet=True)

    try:
        nltk.data.find("corpora/stopwords")
    except LookupError:
        logger.warning("NLTK stopwords not found, downloading... (should be pre-downloaded in Dockerfile)")
        nltk.download("stopwords", quiet=True)

    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False

    # Fallback tokenization
    def word_tokenize(text):
        return text.split()

    stopwords = set(
        [
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
        ]
    )

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


@dataclass
class ATSImprovement:
    """Represents an ATS improvement suggestion"""

    category: str
    title: str
    description: str
    priority: str  # 'high', 'medium', 'low'
    impact_score: int  # 1-10
    action_type: str  # 'add', 'modify', 'remove', 'restructure'
    specific_suggestion: str
    example: Optional[str] = None


class EnhancedATSChecker:
    def __init__(self):
        self.required_sections = {
            "contact": ["name", "email", "phone", "location", "address"],
            "summary": ["summary", "objective", "profile", "about"],
            "experience": [
                "experience",
                "work",
                "employment",
                "career",
                "professional",
            ],
            "education": ["education", "academic", "degree", "qualifications"],
            "skills": ["skills", "technical", "competencies", "expertise"],
        }

        # Enhanced keyword categories
        self.ats_keywords = {
            "action_verbs": [
                "achieved",
                "accomplished",
                "administered",
                "analyzed",
                "architected",
                "built",
                "collaborated",
                "created",
                "delivered",
                "developed",
                "designed",
                "executed",
                "implemented",
                "improved",
                "increased",
                "led",
                "managed",
                "optimized",
                "produced",
                "reduced",
                "resolved",
                "streamlined",
                "transformed",
                "utilized",
                "coordinated",
                "facilitated",
                "initiated",
                "launched",
                "pioneered",
                "spearheaded",
            ],
            "technical_terms": [
                "api",
                "database",
                "framework",
                "algorithm",
                "architecture",
                "automation",
                "cloud",
                "deployment",
                "integration",
                "optimization",
                "scalability",
                "security",
                "microservices",
                "kubernetes",
                "docker",
                "aws",
                "azure",
                "gcp",
                "devops",
                "ci/cd",
                "agile",
                "scrum",
                "machine learning",
                "ai",
                "data science",
            ],
            "metrics": [
                "percent",
                "%",
                "increase",
                "decrease",
                "reduction",
                "improvement",
                "efficiency",
                "performance",
                "cost",
                "revenue",
                "profit",
                "roi",
                "kpi",
                "metrics",
                "analytics",
                "growth",
                "scale",
                "budget",
            ],
            "leadership": [
                "team",
                "lead",
                "manage",
                "mentor",
                "guide",
                "direct",
                "supervise",
                "coordinate",
                "facilitate",
                "collaborate",
                "strategic",
                "vision",
                "initiative",
                "champion",
                "advocate",
                "influence",
            ],
        }

        # Industry-specific keywords
        self.industry_keywords = {
            "tech": [
                "software",
                "development",
                "programming",
                "coding",
                "engineering",
                "technical",
            ],
            "finance": [
                "financial",
                "banking",
                "investment",
                "trading",
                "risk",
                "compliance",
            ],
            "healthcare": [
                "medical",
                "clinical",
                "patient",
                "health",
                "treatment",
                "diagnosis",
            ],
            "marketing": [
                "marketing",
                "brand",
                "campaign",
                "digital",
                "social",
                "content",
            ],
            "sales": [
                "sales",
                "revenue",
                "client",
                "customer",
                "business development",
                "account",
            ],
        }

        # Initialize spaCy model
        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except OSError:
                print(
                    "spaCy model not found. Install with: python -m spacy download en_core_web_sm"
                )
                self.nlp = None
        else:
            self.nlp = None

        if NLTK_AVAILABLE:
            self.stop_words = set(stopwords.words("english"))
        else:
            self.stop_words = set(
                [
                    "the",
                    "a",
                    "an",
                    "and",
                    "or",
                    "but",
                    "in",
                    "on",
                    "at",
                    "to",
                    "for",
                    "of",
                    "with",
                    "by",
                ]
            )

        # Create TF-IDF vectorizer optimized for 2-document comparison (resume + job description)
        # This vectorizer is reused for all calculations - we call fit_transform() each time
        # with new documents, but reuse the same configured vectorizer object for efficiency.
        if SKLEARN_AVAILABLE:
            self.vectorizer = TfidfVectorizer(
                max_features=None,  # No limit - keep all unique terms (safe for 2 documents)
                stop_words="english",  # Remove common words (the, a, an, etc.)
                ngram_range=(1, 2),  # Include unigrams (single words) and bigrams (word pairs)
                min_df=1,  # Term must appear at least once
                max_df=1.0,  # Allow terms appearing in both documents (important for matching)
                lowercase=True,  # Case-insensitive matching
                strip_accents="unicode",  # Normalize accents (é → e)
            )
        else:
            self.vectorizer = None

    def extract_text_from_resume(self, resume_data: Dict, separate_sections: bool = False) -> str:
        """Extract all text content from resume data"""
        text_parts = []

        def get_value(obj, key, default=""):
            if hasattr(obj, key):
                return getattr(obj, key, default)
            elif isinstance(obj, dict):
                return obj.get(key, default)
            return default

        # Add basic info
        name = get_value(resume_data, "name")
        if name:
            text_parts.append(name)

        title = get_value(resume_data, "title")
        if title:
            text_parts.append(title)

        summary = get_value(resume_data, "summary")
        if summary:
            text_parts.append(summary)

        # Add sections
        sections = get_value(resume_data, "sections", [])
        for section in sections:
            section_title = get_value(section, "title")
            if section_title:
                text_parts.append(section_title)

            bullets = get_value(section, "bullets", [])
            for bullet in bullets:
                # Filter out invisible bullets (visible=false)
                bullet_params = get_value(bullet, "params", {})
                if isinstance(bullet_params, dict) and bullet_params.get("visible") is False:
                    continue  # Skip invisible bullets
                
                bullet_text = get_value(bullet, "text")
                if bullet_text:
                    # Extract company headers from work experience sections
                    # Format: **Company / Role / Date** or **Company / Role / Date**
                    if bullet_text.startswith("**") and bullet_text.endswith("**"):
                        # Remove markdown formatting but keep the content
                        clean_text = bullet_text.replace("**", "").strip()
                        # Split by / to extract company, role, and date separately
                        parts = [p.strip() for p in clean_text.split("/")]
                        for part in parts:
                            if part:
                                text_parts.append(part)
                        # Also add the full text for context
                        text_parts.append(clean_text)
                    else:
                        # Regular bullet point
                        text_parts.append(bullet_text)
                
                # Also check for any additional metadata in bullet params (excluding visible flag)
                if isinstance(bullet_params, dict):
                    for key, value in bullet_params.items():
                        if key != "visible" and isinstance(value, str) and value.strip():
                            text_parts.append(value)

        if separate_sections:
            return {
                "summary": summary or "",
                "sections": " ".join([
                    (get_value(s, "title", "") + " " + " ".join([
                        get_value(b, "text", "") 
                        for b in get_value(s, "bullets", [])
                    ])).strip()
                    for s in sections
                ])
            }
        
        return " ".join(text_parts)

    def analyze_resume_structure(self, resume_data: Dict) -> Dict[str, Any]:
        """Comprehensive analysis of resume structure"""
        text_content = self.extract_text_from_resume(resume_data).lower()

        # Check required sections
        found_sections = {}
        missing_sections = []

        for section_type, keywords in self.required_sections.items():
            found = False

            # Check in sections
            sections = resume_data.get("sections", [])
            for section in sections:
                section_title = section.get("title", "").lower()
                for keyword in keywords:
                    if keyword in section_title:
                        found = True
                        break
                if found:
                    break

            # Check in text content
            if not found:
                for keyword in keywords:
                    if keyword in text_content:
                        found = True
                        break

            found_sections[section_type] = found
            if not found:
                missing_sections.append(section_type)

        # Realistic scoring: More accurate base score and better scaling
        found_count = sum(1 for found in found_sections.values() if found)
        base_section_score = found_count * 20  # Realistic: 20 points per section
        
        # Bonus for having contact info
        contact_bonus = 10 if bool(
            resume_data.get("email") or resume_data.get("phone")
        ) else 0
        
        # Bonus for having multiple sections (encourages completeness)
        sections = resume_data.get("sections", [])
        section_count = len(sections)
        section_count_bonus = min(20, section_count * 2)  # Increased cap from 15 to 20
        
        # Bonus for work experience sections (rewards adding experience)
        experience_sections = [s for s in sections if any(
            keyword in s.get("title", "").lower() 
            for keyword in ["experience", "employment", "work", "career", "professional"]
        )]
        experience_bonus = min(8, len(experience_sections) * 2)  # 2 points per experience section, up to 8
        
        # Reduced bonus for having summary/objective to prevent unfair advantage
        summary_bonus = 5 if resume_data.get("summary") else 0
        
        section_score = min(100, base_section_score + contact_bonus + section_count_bonus + summary_bonus + experience_bonus)
        
        # More realistic minimum score - only if resume has meaningful content
        if len(resume_data.get("sections", [])) > 0:
            section_score = max(15, section_score)  # Reduced from 30 to 15 for more realistic scoring

        return {
            "found_sections": found_sections,
            "missing_sections": missing_sections,
            "section_score": section_score,
            "total_sections": len(resume_data.get("sections", [])),
            "has_contact_info": bool(
                resume_data.get("email") or resume_data.get("phone")
            ),
        }

    def analyze_keyword_optimization(
        self, resume_text: str, job_description: str = None
    ) -> Dict[str, Any]:
        """Enhanced keyword analysis with job matching"""
        if not resume_text.strip():
            return {"score": 0, "suggestions": ["Add content to your resume"]}

        # Improved word extraction that handles technical terms with numbers/special chars
        # First, extract all words including those with numbers/special chars
        # Use regex to find word-like tokens (alphanumeric + common tech chars)
        word_pattern = r'\b[a-zA-Z0-9][a-zA-Z0-9+/#.-]*[a-zA-Z]|[a-zA-Z][a-zA-Z0-9+/#.-]*[a-zA-Z0-9]|[a-zA-Z]{2,}\b'
        all_tokens = re.findall(word_pattern, resume_text.lower())
        
        # Filter tokens: keep meaningful words, filter out pure numbers
        words = []
        for token in all_tokens:
            cleaned = token.strip('.,!?;:"()[]{}')
            # Skip pure numbers (e.g., "2024", "5")
            if re.match(r'^\d+$', cleaned):
                continue
            # Skip very short tokens (less than 2 chars) unless they're known tech terms
            if len(cleaned) < 2:
                continue
            # Keep tokens that have at least one letter
            if re.search(r'[a-zA-Z]', cleaned):
                words.append(cleaned)
        
        # Also extract traditional alpha-only words for keyword matching
        alpha_words = [word.strip('.,!?;:"()[]{}') for word in resume_text.lower().split() if word.strip('.,!?;:"()[]{}').isalpha()]
        # Combine both lists, prioritizing technical terms
        words = list(set(words + alpha_words))

        if not words:
            return {
                "score": 0,
                "suggestions": ["Add meaningful content to your resume"],
            }

        # Count keyword occurrences - check both exact matches and partial matches for technical terms
        action_verb_count = sum(
            1 for word in words if word in self.ats_keywords["action_verbs"]
        )
        
        # For technical terms, also check if word contains or is contained in technical keywords
        technical_count = 0
        for word in words:
            # Exact match
            if word in self.ats_keywords["technical_terms"]:
                technical_count += 1
            else:
                # Partial match for terms like "ci/cd", "node.js", etc.
                for tech_term in self.ats_keywords["technical_terms"]:
                    tech_lower = tech_term.lower()
                    # Check if word contains tech term or vice versa (normalize separators)
                    word_normalized = word.replace('/', '').replace('-', '').replace('.', '')
                    tech_normalized = tech_lower.replace('/', '').replace('-', '').replace('.', '')
                    if tech_normalized in word_normalized or word_normalized in tech_normalized:
                        technical_count += 1
                        break
        
        metrics_count = sum(1 for word in words if word in self.ats_keywords["metrics"])
        leadership_count = sum(
            1 for word in words if word in self.ats_keywords["leadership"]
        )

        total_words = len(words)
        
        # Calculate actual densities (use directly without protection)
        action_density = (
            (action_verb_count / total_words) * 100 if total_words > 0 else 0
        )
        technical_density = (
            (technical_count / total_words) * 100 if total_words > 0 else 0
        )
        metrics_density = (metrics_count / total_words) * 100 if total_words > 0 else 0
        leadership_density = (
            (leadership_count / total_words) * 100 if total_words > 0 else 0
        )

        # Job description matching - improved to be more sensitive to keyword additions
        job_match_score = 0
        job_suggestions = []
        matching_keywords = set()  # Initialize for use in bonus calculation
        if job_description:
            # Extract keywords from job description using same improved method
            job_word_pattern = r'\b[a-zA-Z0-9][a-zA-Z0-9+/#.-]*[a-zA-Z]|[a-zA-Z][a-zA-Z0-9+/#.-]*[a-zA-Z0-9]|[a-zA-Z]{2,}\b'
            job_all_tokens = re.findall(job_word_pattern, job_description.lower())
            
            # Filter job keywords same way as resume keywords
            job_keywords = []
            for token in job_all_tokens:
                cleaned = token.strip('.,!?;:"()[]{}')
                # Skip pure numbers
                if re.match(r'^\d+$', cleaned):
                    continue
                # Skip very short tokens
                if len(cleaned) < 2:
                    continue
                # Keep tokens that have at least one letter
                if re.search(r'[a-zA-Z]', cleaned):
                    job_keywords.append(cleaned)
            
            # Also extract alpha-only words
            job_alpha_words = [word.strip('.,!?;:"()[]{}') for word in job_description.lower().split() if word.strip('.,!?;:"()[]{}').isalpha()]
            job_keywords = list(set(job_keywords + job_alpha_words))
            
            # Find matching keywords (exact matches and partial matches for technical terms)
            for resume_word in words:
                for job_word in job_keywords:
                    # Exact match
                    if resume_word == job_word:
                        matching_keywords.add(resume_word)
                    else:
                        # Partial match for technical terms (normalize separators)
                        resume_normalized = resume_word.replace('/', '').replace('-', '').replace('.', '').replace('#', '')
                        job_normalized = job_word.replace('/', '').replace('-', '').replace('.', '').replace('#', '')
                        if resume_normalized == job_normalized or (len(resume_normalized) > 3 and resume_normalized in job_normalized) or (len(job_normalized) > 3 and job_normalized in resume_normalized):
                            matching_keywords.add(resume_word)
                            break
            
            # More sensitive calculation: consider both percentage and absolute count
            if job_keywords:
                match_percentage = (len(matching_keywords) / len(set(job_keywords))) * 100
                # Boost score based on number of matches (more matches = better, increased responsiveness)
                match_count_boost = min(15, len(matching_keywords) * 0.7)  # Increased from 0.5 and cap from 10
                job_match_score = min(100, match_percentage + match_count_boost)
            else:
                job_match_score = 0

            missing_job_keywords = set(job_keywords) - matching_keywords
            if missing_job_keywords:
                job_suggestions.append(
                    f"Add these job-relevant keywords: {', '.join(list(missing_job_keywords)[:5])}"
                )

        # Generate suggestions
        suggestions = []
        if action_density < 1:
            suggestions.append(
                "Add more action verbs (achieved, developed, implemented)"
            )
        if technical_density < 0.5:
            suggestions.append("Include more technical keywords relevant to your field")
        if metrics_density < 0.3:
            suggestions.append("Add quantifiable metrics and achievements")
        if leadership_density < 0.2:
            suggestions.append("Include leadership and team collaboration keywords")

        # Balanced scoring: Highly responsive to improvements, rewards content additions
        base_score = 35
        
        # Calculate bonuses: Prioritize absolute keyword counts (90% count, 10% density)
        # Count-based scoring ensures adding keywords always increases score
        def improved_hybrid_bonus(count, density, density_multiplier, density_base, max_bonus, log_factor=1.2, linear_factor=0.5):
            # Absolute count contribution (primary factor - 90% weight)
            if count <= 20:
                # Linear scaling for small-medium counts (highly responsive to additions)
                count_part = count * linear_factor
            else:
                # Logarithmic scaling for larger counts (prevents extreme values)
                count_part = 10 + math.log1p(count - 20) * log_factor
            
            # Density contribution (secondary factor - 10% weight)
            density_part = density_base + (density_multiplier * min(density, 10))  # Cap density at 10%
            
            # 90% weight on count, 10% on density - ensures adding keywords always improves score
            total_bonus = (count_part * 0.90) + (density_part * 0.10)
            return min(max_bonus, total_bonus)
        
        action_bonus = improved_hybrid_bonus(action_verb_count, action_density, 1.5, 8, 22, 2.0, 0.7)
        technical_bonus = improved_hybrid_bonus(technical_count, technical_density, 2.5, 12, 25, 1.8, 0.6)
        metrics_bonus = improved_hybrid_bonus(metrics_count, metrics_density, 3.0, 12, 22, 2.2, 0.7)
        leadership_bonus = improved_hybrid_bonus(leadership_count, leadership_density, 4.0, 8, 18, 1.5, 0.6)
        
        # Additional bonus for absolute keyword increases (rewards improvements regardless of density)
        # Increased bonuses to make score more responsive and prevent dilution penalties
        absolute_bonus = 0
        if action_verb_count >= 5:
            absolute_bonus += min(4, (action_verb_count - 5) * 0.4)  # Increased from 0.3 to 0.4, cap from 3 to 4
        if technical_count >= 8:
            absolute_bonus += min(5, (technical_count - 8) * 0.4)  # Increased from 0.3 to 0.4, cap from 4 to 5
        if metrics_count >= 3:
            absolute_bonus += min(4, (metrics_count - 3) * 0.5)  # Increased from 0.4 to 0.5, cap from 3 to 4
        if leadership_count >= 3:
            absolute_bonus += min(3, (leadership_count - 3) * 0.4)  # Increased from 0.3 to 0.4, cap from 2 to 3
        
        # Additional protection: bonus for matching keywords when job description is provided
        # This ensures adding matching keywords from JD always improves score
        if job_description and len(matching_keywords) > 0:
            # Reward matching keyword additions (prevents score drop when adding JD keywords)
            matching_bonus = min(5, len(matching_keywords) * 0.15)  # Up to 5 points for matching keywords
            absolute_bonus += matching_bonus
        
        # Job match bonus - highly responsive to keyword additions
        if job_description:
            match_count = len(matching_keywords)
            # Reward both absolute match count and percentage match
            # Linear scaling for match count (most responsive to additions)
            if match_count <= 25:
                match_count_bonus = match_count * 0.8  # Increased from 0.6, higher threshold
            else:
                # Logarithmic for very high counts
                match_count_bonus = 20 + math.log1p(match_count - 25) * 1.8  # Increased base and factor
            
            match_count_bonus = min(20, match_count_bonus)  # Increased cap from 15 to 20
            
            # Percentage bonus (reward overall alignment)
            percentage_bonus = (job_match_score * 0.25)  # Increased from 0.20
            
            job_bonus = min(30, percentage_bonus + match_count_bonus)  # Increased cap from 25 to 30
        else:
            job_bonus = 0

        keyword_score = min(
            100,
            base_score
            + action_bonus
            + technical_bonus
            + metrics_bonus
            + leadership_bonus
            + job_bonus
            + absolute_bonus,  # Add absolute improvement bonus
        )
        
        # Minimal minimum score protection - only prevents catastrophic drops (max 2-3 points)
        # Removed aggressive minimum protection to allow score to reflect actual improvements
        if action_verb_count > 0 or technical_count > 0:
            # Very minimal base - only prevents complete failure
            min_base = 20 + min(3, (action_verb_count + technical_count) * 0.05)
            keyword_score = max(min_base, keyword_score)

        return {
            "score": keyword_score,
            "action_verbs": action_verb_count,
            "technical_terms": technical_count,
            "metrics": metrics_count,
            "leadership": leadership_count,
            "action_density": action_density,
            "technical_density": technical_density,
            "metrics_density": metrics_density,
            "leadership_density": leadership_density,
            "job_match_score": job_match_score,
            "suggestions": suggestions + job_suggestions,
        }

    def analyze_content_quality(self, resume_data: Dict) -> Dict[str, Any]:
        """Analyze content quality and impact"""
        text_content = self.extract_text_from_resume(resume_data)

        # Check for vague language
        vague_terms = [
            "responsible for",
            "assisted with",
            "helped with",
            "involved in",
            "participated in",
        ]
        vague_count = sum(
            1 for term in vague_terms if term.lower() in text_content.lower()
        )

        # Check for quantified achievements
        number_pattern = r"\b\d+(?:\.\d+)?%?\b"
        numbers = re.findall(number_pattern, text_content)
        quantified_achievements = len(numbers)

        # Check for strong action verbs
        strong_verbs = [
            "achieved",
            "delivered",
            "increased",
            "reduced",
            "improved",
            "optimized",
            "transformed",
        ]
        strong_verb_count = sum(
            1 for verb in strong_verbs if verb.lower() in text_content.lower()
        )

        # Check for buzzwords (can be good or bad)
        buzzwords = [
            "synergy",
            "leverage",
            "paradigm",
            "disrupt",
            "innovative",
            "cutting-edge",
        ]
        buzzword_count = sum(
            1 for word in buzzwords if word.lower() in text_content.lower()
        )

        # Stabilized quality score calculation - reduced base to prevent summary inflation
        quality_score = 35  # Reduced from 45 to 35 to prevent excessive score from summary
        
        if quantified_achievements > 0:
            # Reduced scaling to prevent large swings
            quality_score += min(25, math.log1p(quantified_achievements) * 6)  # 30->25, 8->6

        if strong_verb_count > 0:
            # Reduced scaling for smoother changes
            quality_score += min(15, math.log1p(strong_verb_count) * 4)  # 20->15, 6->4

        if vague_count > 0:
            # Further reduced penalty to allow higher scores
            quality_score -= min(6, vague_count * 1.0)  # Reduced from 2.0 to 1.0, cap from 12 to 6

        if buzzword_count > 3:
            # Further reduced penalty to allow higher scores
            quality_score -= min(3, (buzzword_count - 3) * 0.5)  # Reduced from 1.0 to 0.5, cap from 6 to 3

        quality_score = max(0, min(100, quality_score))
        
        # Stabilized minimum score with gradual transition
        if text_content.strip():
            # Gradual minimum based on content quality indicators
            min_base = 30 + min(5, (quantified_achievements + strong_verb_count) * 0.15)
            quality_score = max(min_base, quality_score)

        suggestions = []
        if vague_count > 0:
            suggestions.append("Replace vague terms with specific achievements")
        if quantified_achievements < 2:
            suggestions.append("Add more quantified achievements with numbers")
        if strong_verb_count < 3:
            suggestions.append("Use stronger action verbs to show impact")
        if buzzword_count > 3:
            suggestions.append("Reduce buzzwords and use clear, specific language")

        return {
            "score": quality_score,
            "vague_terms": vague_count,
            "quantified_achievements": quantified_achievements,
            "strong_verbs": strong_verb_count,
            "buzzwords": buzzword_count,
            "suggestions": suggestions,
        }

    def check_formatting_compatibility(self, resume_data: Dict) -> Dict[str, Any]:
        """Check ATS formatting compatibility"""
        text_content = self.extract_text_from_resume(resume_data)

        issues = []
        suggestions = []

        # Check for special characters
        special_chars = re.findall(r"[^\w\s@.-]", text_content)
        if special_chars:
            issues.append("special_characters")
            suggestions.append("Remove special characters and symbols")

        # Check for headers/tables
        if "|" in text_content or "---" in text_content:
            issues.append("table_formatting")
            suggestions.append("Avoid table formatting - use simple text layout")

        # Check for very long lines
        lines = text_content.split("\n")
        long_lines = [line for line in lines if len(line) > 80]
        if long_lines:
            issues.append("long_lines")
            suggestions.append("Keep lines under 80 characters for better ATS parsing")

        # Check for missing contact info
        if not re.search(
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", text_content
        ):
            issues.append("missing_email")
            suggestions.append("Include a professional email address")

        if not re.search(r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", text_content):
            issues.append("missing_phone")
            suggestions.append("Include a phone number")

        # Check for consistent formatting
        sections = resume_data.get("sections", [])
        if sections:
            bullet_consistency = all(
                any(
                    "•" in bullet.get("text", "") or "-" in bullet.get("text", "")
                    for bullet in section.get("bullets", [])
                )
                for section in sections
                if section.get("bullets")
            )
            if not bullet_consistency:
                issues.append("inconsistent_bullets")
                suggestions.append("Use consistent bullet point formatting")

        formatting_score = max(0, 100 - len(issues) * 15)

        return {"score": formatting_score, "issues": issues, "suggestions": suggestions}

    def generate_ai_improvements(
        self, resume_data: Dict, job_description: str = None
    ) -> List[ATSImprovement]:
        """Generate AI-powered improvement suggestions based on the 10 strategies"""
        improvements = []

        # Strategy 1: Professional Summary Enhancement
        summary = resume_data.get("summary", "")
        if not summary or len(summary) < 50:
            improvements.append(
                ATSImprovement(
                    category="Summary",
                    title="Enhance Professional Summary",
                    description="Create a compelling professional summary that highlights your value proposition",
                    priority="high",
                    impact_score=9,
                    action_type="add",
                    specific_suggestion="Write a 2-3 sentence summary focusing on your key strengths and years of experience",
                    example="Experienced Software Engineer with 5+ years developing scalable web applications using React and Node.js. Proven track record of leading cross-functional teams and delivering projects that increased user engagement by 40%.",
                )
            )

        # Strategy 2: Quantified Achievements
        text_content = self.extract_text_from_resume(resume_data)
        numbers = re.findall(r"\b\d+(?:\.\d+)?%?\b", text_content)
        if len(numbers) < 2:
            improvements.append(
                ATSImprovement(
                    category="Achievements",
                    title="Add Quantified Achievements",
                    description="Include specific metrics and numbers to demonstrate impact",
                    priority="high",
                    impact_score=8,
                    action_type="modify",
                    specific_suggestion="Add numbers, percentages, and metrics to your bullet points",
                    example="Instead of 'Improved system performance', write 'Improved system performance by 35% and reduced load times by 2.5 seconds'",
                )
            )

        # Strategy 3: Job Description Alignment
        if job_description:
            job_words = set(job_description.lower().split())
            resume_words = set(text_content.lower().split())
            missing_keywords = job_words - resume_words
            if len(missing_keywords) > 5:
                improvements.append(
                    ATSImprovement(
                        category="Keywords",
                        title="Align with Job Description",
                        description="Include relevant keywords from the job posting",
                        priority="high",
                        impact_score=9,
                        action_type="modify",
                        specific_suggestion=f"Incorporate these job-relevant terms: {', '.join(list(missing_keywords)[:5])}",
                        example="Review the job description and naturally incorporate key terms into your experience descriptions",
                    )
                )

        # Strategy 4: Career Transition Support
        sections = resume_data.get("sections", [])
        experience_section = next(
            (s for s in sections if "experience" in s.get("title", "").lower()), None
        )
        if experience_section and len(experience_section.get("bullets", [])) < 3:
            improvements.append(
                ATSImprovement(
                    category="Experience",
                    title="Strengthen Experience Section",
                    description="Highlight transferable skills and relevant achievements",
                    priority="medium",
                    impact_score=7,
                    action_type="add",
                    specific_suggestion="Add more detailed experience entries with transferable skills",
                    example="Focus on skills that transfer across industries, such as leadership, problem-solving, and project management",
                )
            )

        # Strategy 5: Content Audit
        vague_terms = ["responsible for", "assisted with", "helped with"]
        vague_count = sum(
            1 for term in vague_terms if term.lower() in text_content.lower()
        )
        if vague_count > 0:
            improvements.append(
                ATSImprovement(
                    category="Content",
                    title="Eliminate Vague Language",
                    description="Replace vague terms with specific, impactful language",
                    priority="medium",
                    impact_score=6,
                    action_type="modify",
                    specific_suggestion="Replace vague terms with specific achievements and actions",
                    example="Instead of 'Responsible for managing projects', write 'Led 5 cross-functional projects resulting in 25% efficiency improvement'",
                )
            )

        # Strategy 6: Modern Format
        if len(sections) > 6:
            improvements.append(
                ATSImprovement(
                    category="Format",
                    title="Optimize Resume Length",
                    description="Keep resume concise and focused on recent, relevant experience",
                    priority="medium",
                    impact_score=5,
                    action_type="restructure",
                    specific_suggestion="Limit to 1-2 pages and focus on most recent 10 years of experience",
                    example="Remove older, less relevant positions and focus on recent achievements",
                )
            )

        # Strategy 7: Skills Section Enhancement
        skills_section = next(
            (s for s in sections if "skill" in s.get("title", "").lower()), None
        )
        if not skills_section:
            improvements.append(
                ATSImprovement(
                    category="Skills",
                    title="Add Technical Skills Section",
                    description="Create a comprehensive skills section with relevant technologies",
                    priority="high",
                    impact_score=8,
                    action_type="add",
                    specific_suggestion="Add a skills section with technical tools, software, and competencies",
                    example="Technical Skills: Python, JavaScript, React, AWS, Docker, Kubernetes, Git, Agile/Scrum",
                )
            )

        # Strategy 8: Leadership Emphasis
        leadership_keywords = ["led", "managed", "directed", "supervised", "mentored"]
        leadership_count = sum(
            1 for word in leadership_keywords if word.lower() in text_content.lower()
        )
        if leadership_count < 2:
            improvements.append(
                ATSImprovement(
                    category="Leadership",
                    title="Highlight Leadership Experience",
                    description="Emphasize leadership roles and team management experience",
                    priority="medium",
                    impact_score=6,
                    action_type="modify",
                    specific_suggestion="Add leadership examples and team management experience",
                    example="Include examples of leading teams, mentoring colleagues, or managing projects",
                )
            )

        # Strategy 9: Contact Information
        if not resume_data.get("email") or not resume_data.get("phone"):
            improvements.append(
                ATSImprovement(
                    category="Contact",
                    title="Complete Contact Information",
                    description="Ensure all contact details are present and professional",
                    priority="high",
                    impact_score=10,
                    action_type="add",
                    specific_suggestion="Add professional email and phone number",
                    example="Use a professional email address and include a phone number",
                )
            )

        # Strategy 10: ATS Optimization
        if any(char in text_content for char in ["@", "#", "$", "%", "^", "&", "*"]):
            improvements.append(
                ATSImprovement(
                    category="Format",
                    title="Remove Special Characters",
                    description="Clean up formatting for better ATS compatibility",
                    priority="high",
                    impact_score=7,
                    action_type="modify",
                    specific_suggestion="Remove special characters and use simple formatting",
                    example="Use standard bullet points (•) instead of special symbols",
                )
            )

        return improvements

    def calculate_tfidf_cosine_score(
        self, resume_text: str, job_description: str = None, extracted_keywords: Dict = None
    ) -> Dict[str, Any]:
        """
        Industry-standard TF-IDF + Cosine Similarity scoring method.
        Based on information retrieval best practices used by most ATS systems.
        
        Formula: Cosine Similarity = (A · B) / (||A|| × ||B||)
        Where A and B are TF-IDF vectors of resume and job description.
        
        If extracted_keywords is provided (from extension), uses those keywords instead of
        extracting new ones from job_description. This ensures consistency and accuracy.
        """
        if not resume_text.strip():
            return {
                "score": 0,
                "method": "tfidf_cosine",
                "cosine_similarity": 0.0,
                "tfidf_score": 0.0,
                "matching_keywords": [],
                "missing_keywords": [],
            }
        
        # If extracted_keywords provided, use them; otherwise require job_description
        if extracted_keywords:
            # Use extension-extracted keywords (from LLM)
            use_extracted_keywords = True
        elif job_description and job_description.strip():
            # Fallback to extracting from job_description
            use_extracted_keywords = False
        else:
            return {
                "score": 0,
                "method": "tfidf_cosine",
                "cosine_similarity": 0.0,
                "tfidf_score": 0.0,
                "matching_keywords": [],
                "missing_keywords": [],
            }

        if not SKLEARN_AVAILABLE:
            # Fallback to simple keyword matching if sklearn not available
            return self._fallback_keyword_match(resume_text, job_description)

        try:
            # Reuse the vectorizer from __init__ for efficiency
            # We call fit_transform() each time with new documents, but reuse the same configured object
            if not self.vectorizer:
                # Fallback if vectorizer wasn't initialized (shouldn't happen if SKLEARN_AVAILABLE)
                return self._fallback_keyword_match(resume_text, job_description)

            # If extracted_keywords provided, create a "job description" text from those keywords
            # This ensures we use the extension's meaningful keywords (40-80) instead of extracting 635+
            if use_extracted_keywords:
                # Combine all extension keywords into a text for TF-IDF matching
                all_keywords = []
                all_keywords.extend(extracted_keywords.get("technical_keywords", []))
                all_keywords.extend(extracted_keywords.get("general_keywords", []))
                all_keywords.extend(extracted_keywords.get("soft_skills", []))
                all_keywords.extend(extracted_keywords.get("priority_keywords", []))
                
                # Get high_frequency_keywords if available
                high_freq = extracted_keywords.get("high_frequency_keywords", [])
                if high_freq:
                    # Extract keyword strings from objects if needed
                    high_freq_keywords = [
                        kw.get("keyword", kw) if isinstance(kw, dict) else kw
                        for kw in high_freq
                    ]
                    all_keywords.extend(high_freq_keywords)
                
                # Remove duplicates and create keyword text
                unique_keywords = list(set([str(kw).lower() for kw in all_keywords if kw]))
                # Create a text representation for TF-IDF (join keywords with spaces)
                keyword_text = " ".join(unique_keywords)
                
                # Use extension's total_keywords count if available
                extension_total_keywords = extracted_keywords.get("total_keywords")
                if extension_total_keywords:
                    # Use the count of unique meaningful keywords from extension
                    extension_total_keywords = len(unique_keywords)
            else:
                # Fallback: use job_description as before
                keyword_text = job_description
                extension_total_keywords = None

            # Fit and transform resume and keyword text
            # Note: fit_transform() fits the vectorizer to these specific documents and transforms them
            tfidf_matrix = self.vectorizer.fit_transform([resume_text, keyword_text])

            # Calculate cosine similarity (industry-standard method)
            cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]

            # Convert to percentage score (0-100) with stabilized scaling
            cosine_score = cosine_sim * 100
            # Small base boost for better scaling (5% boost) with smoothing
            if cosine_score > 0:
                cosine_score = min(100, cosine_score * 1.05)
            
            # Store base cosine score for smoothing calculations (if needed in future)
            base_cosine_score = cosine_score

            # Extract feature names (keywords) and their TF-IDF scores
            feature_names = self.vectorizer.get_feature_names_out()
            resume_tfidf = tfidf_matrix[0].toarray()[0]
            job_tfidf = tfidf_matrix[1].toarray()[0]

            # Find matching keywords (present in both with significant weight)
            matching_keywords = []
            missing_keywords = []
            # Use higher threshold for missing keywords to only show impactful ones
            threshold = 0.001  # For matching keywords - catch more
            missing_keyword_threshold = 0.01  # For missing keywords - only show significant ones

            # Also do direct keyword matching for extracted keywords (more lenient)
            direct_matching_keywords = set()
            if use_extracted_keywords and extracted_keywords:
                # Normalize resume text for direct matching
                resume_text_lower = resume_text.lower()
                
                # Check all keyword categories
                for keyword_list in [
                    extracted_keywords.get("technical_keywords", []),
                    extracted_keywords.get("general_keywords", []),
                    extracted_keywords.get("soft_skills", []),
                    extracted_keywords.get("priority_keywords", []),
                ]:
                    for kw in keyword_list:
                        if not kw:
                            continue
                        kw_str = str(kw).lower().strip()
                        # More lenient matching: check for keyword as whole word or part of word
                        # Use word boundaries for better matching
                        # Check for exact word match or as part of a compound word
                        pattern = r'\b' + re.escape(kw_str) + r'\b'
                        if re.search(pattern, resume_text_lower):
                            direct_matching_keywords.add(kw_str)
                        # Also check if keyword is part of resume text (for compound words)
                        elif kw_str in resume_text_lower:
                            direct_matching_keywords.add(kw_str)
                
                # Check high frequency keywords
                high_freq = extracted_keywords.get("high_frequency_keywords", [])
                for kw_item in high_freq:
                    kw = kw_item.get("keyword", kw_item) if isinstance(kw_item, dict) else kw_item
                    if kw:
                        kw_str = str(kw).lower().strip()
                        # More lenient matching for high frequency keywords
                        pattern = r'\b' + re.escape(kw_str) + r'\b'
                        if re.search(pattern, resume_text_lower):
                            direct_matching_keywords.add(kw_str)
                        elif kw_str in resume_text_lower:
                            direct_matching_keywords.add(kw_str)

            for i, keyword in enumerate(feature_names):
                job_weight = job_tfidf[i]
                resume_weight = resume_tfidf[i]

                if job_weight > threshold:
                    if resume_weight > threshold:
                        matching_keywords.append(
                            {
                                "keyword": keyword,
                                "job_weight": round(float(job_weight), 4),
                                "resume_weight": round(float(resume_weight), 4),
                            }
                        )
                    else:
                        # Only add missing keywords with significant weight that will impact score
                        if job_weight > missing_keyword_threshold:
                            missing_keywords.append(
                                {"keyword": keyword, "weight": round(float(job_weight), 4)}
                            )
            
            # Merge direct matching keywords with TF-IDF matches
            # Add direct matches that weren't caught by TF-IDF
            for direct_kw in direct_matching_keywords:
                # Check if already in matching_keywords
                if not any(mk["keyword"].lower() == direct_kw for mk in matching_keywords):
                    # Add with a reasonable weight estimate
                    matching_keywords.append({
                        "keyword": direct_kw,
                        "job_weight": 0.1,  # Default weight for direct matches
                        "resume_weight": 0.1,
                    })

            # Sort by weight (most important first)
            matching_keywords.sort(key=lambda x: x["job_weight"], reverse=True)
            missing_keywords.sort(key=lambda x: x["weight"], reverse=True)
            
            # Limit missing keywords to top 40 most impactful (those that will meaningfully improve score)
            missing_keywords = missing_keywords[:40]
            
            # Increased boost for matching keywords to reward keyword additions
            matching_count = len(matching_keywords)
            if matching_count > 20:
                # More generous boost for very high counts
                boost = min(20, 10 + (matching_count - 20) * 0.8)  # 12->20, 8->10, 0.2->0.8
                cosine_score = min(100, cosine_score + boost)
            elif matching_count > 15:
                # More generous boost for high counts
                boost = min(15, 8 + (matching_count - 15) * 1.0)  # 8->15, 5->8, 0.6->1.0
                cosine_score = min(100, cosine_score + boost)
            elif matching_count > 10:
                # More generous boost for medium-high counts
                boost = min(10, 5 + (matching_count - 10) * 1.0)  # 5->10, 2->5, 0.6->1.0
                cosine_score = min(100, cosine_score + boost)
            elif matching_count > 5:
                # More generous boost for medium counts
                boost = min(5, (matching_count - 5) * 0.8)  # 2->5, 0.4->0.8
                cosine_score = min(100, cosine_score + boost)
            elif matching_count > 0:
                # More generous boost for small counts
                boost = min(2, matching_count * 0.4)  # 1->2, 0.2->0.4 per keyword
                cosine_score = min(100, cosine_score + boost)

            # Calculate keyword match percentage with improved algorithm
            # Use extension's total_keywords if available (more accurate than TF-IDF count)
            if use_extracted_keywords and extension_total_keywords:
                total_job_keywords = extension_total_keywords
            else:
                total_job_keywords = len([w for w in job_tfidf if w > threshold])
            
            # Count direct matches in total
            direct_match_count = len(direct_matching_keywords) if use_extracted_keywords else 0
            
            # Calculate weighted match score based on keyword importance
            total_job_weight = sum(job_tfidf[i] for i in range(len(job_tfidf)) if job_tfidf[i] > threshold)
            matched_weight = sum(
                job_tfidf[i] for i in range(len(job_tfidf))
                if job_tfidf[i] > threshold and resume_tfidf[i] > threshold
            )
            
            # Add weight for direct matches (they're important even if TF-IDF weight is low)
            if direct_match_count > 0:
                # Add weight proportional to number of direct matches
                direct_match_weight = min(0.3, direct_match_count * 0.02)  # Up to 30% additional weight
                matched_weight += direct_match_weight * total_job_weight
            
            # Use weighted percentage for better accuracy
            if total_job_weight > 0:
                weighted_match_percentage = (matched_weight / total_job_weight) * 100
            else:
                weighted_match_percentage = 0
            
            # Also calculate simple count-based percentage (including direct matches)
            # Count unique matching keywords (TF-IDF + direct)
            total_matching_count = len(matching_keywords)  # Already includes direct matches
            simple_match_percentage = (
                (total_matching_count / total_job_keywords * 100)
                if total_job_keywords > 0
                else 0
            )
            
            # Use weighted average (60% weighted, 40% simple) - favor weighted but include count
            # This ensures direct matches are properly counted
            base_match_percentage = (weighted_match_percentage * 0.6) + (simple_match_percentage * 0.4)
            
            # Add responsive boost for having matching keywords
            # Increased boost to reward keyword additions
            matching_count = len(matching_keywords)
            if matching_count > 20:
                # More generous boost for high counts
                boost = min(30, (matching_count - 20) * 1.5)  # 20->30, 1.0->1.5% per keyword
                match_percentage = min(100, base_match_percentage + boost)
            elif matching_count > 15:
                # More generous boost for medium-high counts
                boost = min(20, 5 + (matching_count - 15) * 1.5)  # 15->20, 3->5, 1.2->1.5% per keyword
                match_percentage = min(100, base_match_percentage + boost)
            elif matching_count > 10:
                # Linear scaling for medium counts - very responsive
                boost = min(10, (matching_count - 10) * 1.2)  # 1.2% per keyword
                match_percentage = min(100, base_match_percentage + boost)
            elif matching_count > 5:
                # Linear scaling for small counts - most responsive
                boost = min(8, (matching_count - 5) * 1.0)  # 1.0% per keyword
                match_percentage = min(100, base_match_percentage + boost)
            elif matching_count > 0:
                # Even small counts get a boost - reward any matches
                boost = min(5, matching_count * 1.0)  # 1.0% per keyword
                match_percentage = min(100, base_match_percentage + boost)
            else:
                match_percentage = base_match_percentage

            result = {
                "score": round(cosine_score, 2),
                "method": "tfidf_cosine",
                "cosine_similarity": round(float(cosine_sim), 4),
                "tfidf_score": round(cosine_score, 2),
                "keyword_match_percentage": round(match_percentage, 2),
                "matching_keywords": matching_keywords[:20],  # Top 20 matches
                "missing_keywords": missing_keywords,  # Already filtered to top 40 most impactful
                "total_job_keywords": total_job_keywords,
                "matched_keywords_count": len(matching_keywords),
            }
            
            # If using extracted_keywords, also include the original keywords for reference
            if use_extracted_keywords and extracted_keywords:
                result["original_keywords"] = {
                    "technical_keywords": extracted_keywords.get("technical_keywords", []),
                    "general_keywords": extracted_keywords.get("general_keywords", []),
                    "soft_skills": extracted_keywords.get("soft_skills", []),
                    "priority_keywords": extracted_keywords.get("priority_keywords", []),
                    "high_frequency_keywords": extracted_keywords.get("high_frequency_keywords", []),
                }
            
            return result

        except Exception as e:
            # Fallback to simple matching on error
            return self._fallback_keyword_match(resume_text, job_description)

    def _fallback_keyword_match(
        self, resume_text: str, job_description: str
    ) -> Dict[str, Any]:
        """Fallback keyword matching when TF-IDF is not available"""
        resume_words = set(resume_text.lower().split())
        job_words = set(job_description.lower().split())

        matching = resume_words & job_words
        missing = job_words - resume_words

        match_percentage = (
            (len(matching) / len(job_words) * 100) if job_words else 0
        )

        return {
            "score": round(match_percentage, 2),
            "method": "simple_keyword_match",
            "cosine_similarity": 0.0,
            "tfidf_score": 0.0,
            "keyword_match_percentage": round(match_percentage, 2),
            "matching_keywords": list(matching)[:20],
            "missing_keywords": list(missing)[:20],
            "total_job_keywords": len(job_words),
            "matched_keywords_count": len(matching),
        }

    def calculate_industry_standard_score(
        self, resume_data: Dict, job_description: str = None, extracted_keywords: Dict = None
    ) -> Dict[str, Any]:
        """
        Industry-standard ATS score using TF-IDF + Cosine Similarity.
        Based on information retrieval best practices.
        
        Formula (keyword-focused for easier 80-84 achievement):
        Overall Score = (Keyword Match Score × 0.85) + 
                       (TF-IDF Cosine Score × 0.05) +
                       (Section Score × 0.05) +
                       (Formatting Score × 0.03) +
                       (Content Quality × 0.02)
        
        Keyword matching is 85% of the score, making keyword improvements the primary factor.
        """
        resume_text = self.extract_text_from_resume(resume_data)

        # 1. TF-IDF + Cosine Similarity (5% weight - keyword-focused scoring)
        tfidf_analysis = self.calculate_tfidf_cosine_score(resume_text, job_description, extracted_keywords=extracted_keywords)
        tfidf_score = tfidf_analysis.get("score", 0)

        # 2. Keyword Match Percentage (85% weight - primary factor)
        keyword_match_score = tfidf_analysis.get("keyword_match_percentage", 0)

        # 3. Section Completeness (5% weight)
        structure_analysis = self.analyze_resume_structure(resume_data)
        section_score = structure_analysis["section_score"]

        # 4. Formatting Compatibility (3% weight)
        formatting_analysis = self.check_formatting_compatibility(resume_data)
        formatting_score = formatting_analysis["score"]

        # 5. Content Quality (2% weight)
        quality_analysis = self.analyze_content_quality(resume_data)
        quality_score = quality_analysis["score"]

        # Keyword matching is 50-60% of the score (primary factor)
        # Higher weight for better keyword matches to reward improvements
        if keyword_match_score >= 85:
            keyword_weight = 0.60  # Higher weight for strong keyword matches
        else:
            keyword_weight = 0.50  # Standard weight for lower matches
        
        # Distribute remaining weight among other components
        if keyword_match_score >= 85:
            tfidf_weight = 0.20
            section_weight = 0.12
            formatting_weight = 0.05
            quality_weight = 0.03
        else:
            tfidf_weight = 0.25
            section_weight = 0.15
            formatting_weight = 0.07
            quality_weight = 0.03

        # No diminishing returns - use keyword match score directly
        # This ensures adding keywords always increases score proportionally
        actual_keyword_contribution = keyword_match_score * keyword_weight

        # Calculate weighted overall score with adaptive weights
        # Use base score directly - no baseline protections that prevent score increases
        overall_score = (
            tfidf_score * tfidf_weight
            + actual_keyword_contribution
            + section_score * section_weight
            + formatting_score * formatting_weight
            + quality_score * quality_weight
        )
        
        # Minimal protection: only prevent catastrophic drops (max 2-3 points)
        # Calculate minimal baseline based on having basic content
        resume_text_check = self.extract_text_from_resume(resume_data)
        if resume_text_check.strip():
            minimal_baseline = 15  # Very minimal baseline
            sections = resume_data.get("sections", [])
            if len(sections) > 0:
                minimal_baseline += min(5, len(sections) * 0.5)
            # Only use minimal baseline if score would drop catastrophically
            if overall_score < minimal_baseline - 3:
                overall_score = max(overall_score, minimal_baseline - 3)
        
        # Add bonuses to reward improvements: increased caps to allow score growth
        # Total bonus cap: maximum 5 points total from all bonuses combined (increased from 3)
        total_bonus = 0
        
        # Bonus for high keyword match percentage (more generous)
        if keyword_match_score >= 95:
            bonus = min(1.5, 0.5 + (keyword_match_score - 95) * 0.1)  # Max 1.5 points (was 0.5)
            total_bonus += bonus
        elif keyword_match_score >= 90:
            bonus = min(1.0, 0.3 + (keyword_match_score - 90) * 0.1)  # Max 1.0 points (was 0.4)
            total_bonus += bonus
        elif keyword_match_score >= 85:
            bonus = min(0.8, 0.2 + (keyword_match_score - 85) * 0.12)  # Max 0.8 points (was 0.3)
            total_bonus += bonus
        elif keyword_match_score >= 75:
            bonus = min(0.5, (keyword_match_score - 75) * 0.05)  # New tier for 75-85%
            total_bonus += bonus
        
        # Bonus for high TF-IDF score (more generous)
        if tfidf_score >= 90:
            bonus = min(1.5, 0.5 + (tfidf_score - 90) * 0.1)  # Max 1.5 points (was 0.5)
            total_bonus += bonus
        elif tfidf_score >= 85:
            bonus = min(1.0, 0.3 + (tfidf_score - 85) * 0.1)  # Max 1.0 points (was 0.4)
            total_bonus += bonus
        elif tfidf_score >= 80:
            bonus = min(0.8, 0.2 + (tfidf_score - 80) * 0.12)  # Max 0.8 points (was 0.3)
            total_bonus += bonus
        elif tfidf_score >= 70:
            bonus = min(0.5, (tfidf_score - 70) * 0.05)  # New tier for 70-80%
            total_bonus += bonus
        
        # Bonus for having matching keywords (more generous - lower thresholds)
        matching_count = tfidf_analysis.get("matched_keywords_count", 0)
        if matching_count > 40:
            bonus = min(1.0, 0.3 + (matching_count - 40) * 0.1)  # Max 1.0 points (was 0.5, threshold lowered)
            total_bonus += bonus
        elif matching_count > 30:
            bonus = min(0.8, 0.2 + (matching_count - 30) * 0.08)  # Max 0.8 points (was 0.4, threshold lowered)
            total_bonus += bonus
        elif matching_count > 20:
            bonus = min(0.6, 0.1 + (matching_count - 20) * 0.05)  # Max 0.6 points (was 0.3, threshold lowered)
            total_bonus += bonus
        elif matching_count > 15:
            bonus = min(0.3, (matching_count - 15) * 0.06)  # New tier for 15-20 matches
            total_bonus += bonus

        # Synergy bonus (more generous thresholds)
        if keyword_match_score >= 90 and tfidf_score >= 80:
            synergy_bonus = min(1.0, (keyword_match_score - 90) * 0.05 + (tfidf_score - 80) * 0.05)  # Max 1.0 points (was 0.5, thresholds lowered)
            total_bonus += synergy_bonus
        
        # Apply total bonus cap: maximum 5 points from all bonuses combined (increased from 3)
        total_bonus = min(5, total_bonus)
        overall_score += total_bonus

        # No artificial caps - allow scores to reach 95-100 with strong keyword matching
        # Scores are calculated directly from components without diminishing returns

        # Generate improvements
        improvements = self.generate_ai_improvements(resume_data, job_description)

        # Compile suggestions
        all_suggestions = []
        all_suggestions.extend(quality_analysis.get("suggestions", []))
        all_suggestions.extend(formatting_analysis.get("suggestions", []))

        if structure_analysis["missing_sections"]:
            all_suggestions.append(
                f"Add missing sections: {', '.join(structure_analysis['missing_sections'])}"
            )

        # Add TF-IDF specific suggestions
        missing_keywords = tfidf_analysis.get("missing_keywords", [])
        if missing_keywords:
            top_missing = [kw["keyword"] for kw in missing_keywords[:5]]
            all_suggestions.append(
                f"Add these important keywords from job description: {', '.join(top_missing)}"
            )

        return {
            "overall_score": min(100, max(0, int(overall_score))),
            "method": "industry_standard_tfidf",
            "tfidf_analysis": tfidf_analysis,
            "structure_analysis": structure_analysis,
            "formatting_analysis": formatting_analysis,
            "quality_analysis": quality_analysis,
            "score_breakdown": {
                "tfidf_cosine_score": round(tfidf_score, 2),
                "keyword_match_score": round(keyword_match_score, 2),
                "section_score": section_score,
                "formatting_score": formatting_score,
                "quality_score": quality_score,
                "weights_used": {
                    "tfidf_weight": tfidf_weight,
                    "keyword_weight": keyword_weight,
                    "section_weight": section_weight,
                    "formatting_weight": formatting_weight,
                    "quality_weight": quality_weight,
                },
            },
            "ai_improvements": [
                {
                    "category": imp.category,
                    "title": imp.title,
                    "description": imp.description,
                    "priority": imp.priority,
                    "impact_score": imp.impact_score,
                    "action_type": imp.action_type,
                    "specific_suggestion": imp.specific_suggestion,
                    "example": imp.example,
                }
                for imp in improvements
            ],
            "suggestions": list(set(all_suggestions)),
        }

    def calculate_comprehensive_score(
        self, resume_data: Dict, job_description: str = None
    ) -> Dict[str, Any]:
        """Calculate comprehensive ATS compatibility score"""
        resume_text = self.extract_text_from_resume(resume_data)

        # Get individual analyses
        structure_analysis = self.analyze_resume_structure(resume_data)
        keyword_analysis = self.analyze_keyword_optimization(
            resume_text, job_description
        )
        quality_analysis = self.analyze_content_quality(resume_data)
        formatting_analysis = self.check_formatting_compatibility(resume_data)

        # Realistic weighted scoring: Better balance for accurate scores
        base_overall_score = (
            structure_analysis["section_score"] * 0.25
            + keyword_analysis["score"] * 0.35
            + quality_analysis["score"] * 0.28
            + formatting_analysis["score"] * 0.12
        )
        
        # Calculate protected baseline to prevent large drops (stronger protection)
        protected_baseline = (
            max(0, structure_analysis["section_score"] - 2) * 0.25
            + max(0, keyword_analysis["score"] - 4) * 0.35
            + max(0, quality_analysis["score"] - 3) * 0.28
            + max(0, formatting_analysis["score"] - 1) * 0.12
        )
        
        # Calculate content-based baseline (reduced to prevent excessive scores)
        content_baseline = 0
        if resume_text.strip():
            content_baseline = 20  # Reduced from 28 to 20
            sections = resume_data.get("sections", [])
            if len(sections) > 0:
                content_baseline += min(8, len(sections) * 1.2)  # Reduced from 12/1.8 to 8/1.2
            if resume_data.get("summary"):
                content_baseline += 2  # Reduced from 3 to 2
            if resume_data.get("email") or resume_data.get("phone"):
                content_baseline += 1  # Reduced from 2 to 1
            
            # Add protected component contributions (reduced multipliers)
            content_baseline += (structure_analysis["section_score"] * 0.25 * 0.70)  # 0.85 -> 0.70
            content_baseline += (formatting_analysis["score"] * 0.12 * 0.75)  # 0.9 -> 0.75
            content_baseline += (quality_analysis["score"] * 0.28 * 0.65)  # 0.8 -> 0.65
            content_baseline += (keyword_analysis["score"] * 0.35 * 0.60)  # 0.7 -> 0.6
        
        # Cap content_baseline at 50 to allow scores above 82 (increased from 45)
        content_baseline = min(50, content_baseline)
        
        # Use the highest of: base score, protected baseline, or content baseline
        overall_score = max(base_overall_score, protected_baseline, content_baseline)

        # Generate AI improvements
        improvements = self.generate_ai_improvements(resume_data, job_description)

        # Compile all suggestions
        all_suggestions = []
        all_suggestions.extend(keyword_analysis.get("suggestions", []))
        all_suggestions.extend(quality_analysis.get("suggestions", []))
        all_suggestions.extend(formatting_analysis.get("suggestions", []))

        if structure_analysis["missing_sections"]:
            all_suggestions.append(
                f"Add missing sections: {', '.join(structure_analysis['missing_sections'])}"
            )

        return {
            "overall_score": min(100, max(0, int(overall_score))),
            "structure_analysis": structure_analysis,
            "keyword_analysis": keyword_analysis,
            "quality_analysis": quality_analysis,
            "formatting_analysis": formatting_analysis,
            "ai_improvements": [
                {
                    "category": imp.category,
                    "title": imp.title,
                    "description": imp.description,
                    "priority": imp.priority,
                    "impact_score": imp.impact_score,
                    "action_type": imp.action_type,
                    "specific_suggestion": imp.specific_suggestion,
                    "example": imp.example,
                }
                for imp in improvements
            ],
            "suggestions": list(set(all_suggestions)),
        }

    def get_enhanced_ats_score(
        self,
        resume_data: Dict,
        job_description: str = None,
        use_industry_standard: bool = False,
        extracted_keywords: Dict = None,
        previous_score: int = None,
    ) -> Dict[str, Any]:
        """
        Main method to get enhanced ATS compatibility score and AI improvements.
        
        Args:
            resume_data: Resume data dictionary
            job_description: Optional job description for matching
            use_industry_standard: If True, uses TF-IDF + Cosine Similarity (industry standard).
                                  If False, uses custom comprehensive scoring (default).
            previous_score: DEPRECATED - kept for backward compatibility but not used
        """
        try:
            if use_industry_standard and (job_description or extracted_keywords):
                # Use industry-standard TF-IDF + Cosine Similarity method
                # Pass extracted_keywords if available (from extension)
                result = self.calculate_industry_standard_score(
                    resume_data, job_description, extracted_keywords=extracted_keywords
                )
            else:
                # Use custom comprehensive scoring (original method)
                result = self.calculate_comprehensive_score(resume_data, job_description)

            calculated_score = result["overall_score"]
            
            # Apply AI agent semantic quality adjustment if available
            try:
                from app.core.dependencies import ats_scoring_agent
                
                if ats_scoring_agent and extracted_keywords:
                    # Extract keyword matches and missing from result
                    keyword_matches = []
                    missing_keywords = []
                    
                    # Get from TF-IDF analysis if available (industry standard method)
                    if "tfidf_analysis" in result:
                        tfidf_analysis = result["tfidf_analysis"]
                        keyword_matches = [
                            kw["keyword"] if isinstance(kw, dict) else kw
                            for kw in tfidf_analysis.get("matching_keywords", [])
                        ]
                        missing_keywords = [
                            kw["keyword"] if isinstance(kw, dict) else kw
                            for kw in tfidf_analysis.get("missing_keywords", [])
                        ]
                    # Or get from keyword_analysis (comprehensive method)
                    elif "keyword_analysis" in result:
                        keyword_analysis = result["keyword_analysis"]
                        # Extract matched/missing from job_match_score analysis if available
                        job_match = keyword_analysis.get("job_match_keywords", {})
                        keyword_matches = job_match.get("matched", [])
                        missing_keywords = job_match.get("missing", [])
                    
                    # Only run agent if we have keyword data
                    if keyword_matches or missing_keywords:
                        # Run async agent analysis (sync wrapper)
                        try:
                            loop = asyncio.get_event_loop()
                        except RuntimeError:
                            loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(loop)
                        
                        semantic_analysis = loop.run_until_complete(
                            ats_scoring_agent.analyze_semantic_quality(
                                resume_data=resume_data,
                                job_description=job_description,
                                extracted_keywords=extracted_keywords,
                                keyword_matches=keyword_matches,
                                missing_keywords=missing_keywords,
                            )
                        )
                        
                        # Apply semantic adjustment (30% of adjustment to prevent over-correction)
                        adjustment = semantic_analysis.get("adjustment", 0) * 0.3
                        calculated_score = max(0, min(100, calculated_score + adjustment))
                        
                        # Add semantic analysis to details
                        result["semantic_analysis"] = semantic_analysis
                        logger.debug(f"Applied semantic adjustment: {adjustment:.2f} (quality_score: {semantic_analysis.get('quality_score', 50)})")
                    
            except Exception as e:
                # Non-critical: if agent fails, continue with rule-based score
                logger.warning(f"ATS scoring agent analysis failed, using rule-based score only: {e}")
            
            return {
                "success": True,
                "score": round(calculated_score, 1),
                "details": result,
                "suggestions": result["suggestions"],
                "ai_improvements": result.get("ai_improvements", []),
                "method": result.get("method", "comprehensive"),
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "score": 0,
                "suggestions": ["Unable to analyze resume. Please check your content."],
                "ai_improvements": [],
                "method": "error",
            }
