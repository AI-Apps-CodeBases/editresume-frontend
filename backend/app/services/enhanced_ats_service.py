import re
import math
import json
from typing import Dict, List, Tuple, Optional, Any
from collections import Counter
from dataclasses import dataclass

# Try to import optional dependencies with fallbacks
try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize

    # Download required NLTK data
    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        nltk.download("punkt")

    try:
        nltk.data.find("corpora/stopwords")
    except LookupError:
        nltk.download("stopwords")

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

    def extract_text_from_resume(self, resume_data: Dict) -> str:
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
                bullet_text = get_value(bullet, "text")
                if bullet_text:
                    text_parts.append(bullet_text)

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
        
        # Bonus for having multiple sections (encourages completeness) - more realistic cap
        section_count_bonus = min(15, len(resume_data.get("sections", [])) * 2)  # Reduced from 30 to 15
        
        # Additional bonus for having summary/objective
        summary_bonus = 8 if resume_data.get("summary") else 0
        
        section_score = min(100, base_section_score + contact_bonus + section_count_bonus + summary_bonus)
        
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

        words = resume_text.lower().split()
        words = [word.strip('.,!?;:"()[]{}') for word in words if word.isalpha()]

        if not words:
            return {
                "score": 0,
                "suggestions": ["Add meaningful content to your resume"],
            }

        # Count keyword occurrences
        action_verb_count = sum(
            1 for word in words if word in self.ats_keywords["action_verbs"]
        )
        technical_count = sum(
            1 for word in words if word in self.ats_keywords["technical_terms"]
        )
        metrics_count = sum(1 for word in words if word in self.ats_keywords["metrics"])
        leadership_count = sum(
            1 for word in words if word in self.ats_keywords["leadership"]
        )

        total_words = len(words)

        # Calculate densities
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
            job_words = job_description.lower().split()
            job_keywords = [
                word.strip('.,!?;:"()[]{}') for word in job_words if word.isalpha()
            ]
            matching_keywords = set(words) & set(job_keywords)
            
            # More sensitive calculation: consider both percentage and absolute count
            if job_keywords:
                match_percentage = (len(matching_keywords) / len(set(job_keywords))) * 100
                # Boost score based on number of matches (more matches = better)
                match_count_boost = min(10, len(matching_keywords) * 0.5)
                job_match_score = min(100, match_percentage + match_count_boost)
            else:
                job_match_score = 0

            missing_job_keywords = set(job_keywords) - set(words)
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

        # Conservative scoring: More accurate base with reduced bonuses
        base_score = 35  # More conservative starting point
        
        # Use both density AND absolute counts with reduced bonuses
        # This ensures adding keywords increases the score but more conservatively
        action_bonus = min(20, 8 + (action_density * 1.5) + min(8, action_verb_count * 0.4))
        technical_bonus = min(20, 12 + (technical_density * 2.5) + min(8, technical_count * 0.3))
        metrics_bonus = min(20, 12 + (metrics_density * 3) + min(8, metrics_count * 0.4))
        leadership_bonus = min(15, 8 + (leadership_density * 4) + min(6, leadership_count * 0.3))
        
        # Job match bonus - conservative calculation
        # Use both percentage and absolute count for better responsiveness
        if job_description:
            # Calculate bonus based on both match percentage and number of matches
            match_count = len(matching_keywords)
            job_bonus = min(25, (job_match_score * 0.25) + min(10, match_count * 0.3))
        else:
            job_bonus = 0

        keyword_score = min(
            100,
            base_score
            + action_bonus
            + technical_bonus
            + metrics_bonus
            + leadership_bonus
            + job_bonus,
        )
        
        # More realistic minimum score - only if resume has meaningful keywords
        if action_verb_count > 0 or technical_count > 0:
            keyword_score = max(25, keyword_score)  # Reduced from 40 to 25 for more realistic scoring

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

        # Realistic quality score calculation: More accurate base and better rewards
        quality_score = 45  # More realistic starting point (reduced from 60)

        if quantified_achievements > 0:
            quality_score += min(30, quantified_achievements * 5)  # More realistic scaling

        if strong_verb_count > 0:
            quality_score += min(20, strong_verb_count * 3)  # More realistic scaling

        if vague_count > 0:
            quality_score -= min(12, vague_count * 2.5)  # More realistic penalty

        if buzzword_count > 3:
            quality_score -= min(6, (buzzword_count - 3) * 1.2)  # More realistic penalty

        quality_score = max(0, min(100, quality_score))
        
        # More realistic minimum score - only if resume has meaningful content
        if text_content.strip():
            quality_score = max(30, quality_score)  # Reduced from 45 to 30 for more realistic scoring

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

            # Convert to percentage score (0-100) with conservative scaling
            cosine_score = cosine_sim * 100
            # Small base boost for better scaling (5% boost)
            if cosine_score > 0:
                cosine_score = min(100, cosine_score * 1.05)  # 5% boost to base score

            # Extract feature names (keywords) and their TF-IDF scores
            feature_names = self.vectorizer.get_feature_names_out()
            resume_tfidf = tfidf_matrix[0].toarray()[0]
            job_tfidf = tfidf_matrix[1].toarray()[0]

            # Find matching keywords (present in both with significant weight)
            matching_keywords = []
            missing_keywords = []
            threshold = 0.01  # Minimum TF-IDF score to consider

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
                        missing_keywords.append(
                            {"keyword": keyword, "weight": round(float(job_weight), 4)}
                        )

            # Sort by weight (most important first)
            matching_keywords.sort(key=lambda x: x["job_weight"], reverse=True)
            missing_keywords.sort(key=lambda x: x["weight"], reverse=True)
            
            # Add conservative boost based on number of matching keywords
            matching_count = len(matching_keywords)
            if matching_count > 15:
                cosine_score = min(100, cosine_score + min(10, (matching_count - 15) * 0.4))
            elif matching_count > 10:
                cosine_score = min(100, cosine_score + min(7, (matching_count - 10) * 0.35))
            elif matching_count > 5:
                cosine_score = min(100, cosine_score + min(4, (matching_count - 5) * 0.3))

            # Calculate keyword match percentage with improved algorithm
            # Use extension's total_keywords if available (more accurate than TF-IDF count)
            if use_extracted_keywords and extension_total_keywords:
                total_job_keywords = extension_total_keywords
            else:
                total_job_keywords = len([w for w in job_tfidf if w > threshold])
            
            # Calculate weighted match score based on keyword importance
            total_job_weight = sum(job_tfidf[i] for i in range(len(job_tfidf)) if job_tfidf[i] > threshold)
            matched_weight = sum(
                job_tfidf[i] for i in range(len(job_tfidf))
                if job_tfidf[i] > threshold and resume_tfidf[i] > threshold
            )
            
            # Use weighted percentage for better accuracy
            if total_job_weight > 0:
                weighted_match_percentage = (matched_weight / total_job_weight) * 100
            else:
                weighted_match_percentage = 0
            
            # Also calculate simple count-based percentage
            simple_match_percentage = (
                (len(matching_keywords) / total_job_keywords * 100)
                if total_job_keywords > 0
                else 0
            )
            
            # Use the higher of the two to be more forgiving, with boost for more matches
            base_match_percentage = max(weighted_match_percentage, simple_match_percentage * 0.9)
            
            # Add conservative boost for having many matching keywords
            if len(matching_keywords) > 20:
                match_percentage = min(100, base_match_percentage + min(4, (len(matching_keywords) - 20) * 0.15))
            elif len(matching_keywords) > 15:
                match_percentage = min(100, base_match_percentage + min(3, (len(matching_keywords) - 15) * 0.2))
            elif len(matching_keywords) > 10:
                match_percentage = min(100, base_match_percentage + min(2, (len(matching_keywords) - 10) * 0.2))
            elif len(matching_keywords) > 5:
                match_percentage = min(100, base_match_percentage + min(1, (len(matching_keywords) - 5) * 0.2))
            else:
                match_percentage = base_match_percentage

            result = {
                "score": round(cosine_score, 2),
                "method": "tfidf_cosine",
                "cosine_similarity": round(float(cosine_sim), 4),
                "tfidf_score": round(cosine_score, 2),
                "keyword_match_percentage": round(match_percentage, 2),
                "matching_keywords": matching_keywords[:20],  # Top 20 matches
                "missing_keywords": missing_keywords[:20],  # Top 20 missing
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
        
        Formula (improved to allow more room for improvement):
        Overall Score = (TF-IDF Cosine Score × 0.35) + 
                       (Keyword Match Score × 0.25) +
                       (Section Score × 0.20) +
                       (Formatting Score × 0.12) +
                       (Content Quality × 0.08)
        
        When TF-IDF is low, more weight is given to other factors.
        """
        resume_text = self.extract_text_from_resume(resume_data)

        # 1. TF-IDF + Cosine Similarity (35% weight, reduced from 40%)
        tfidf_analysis = self.calculate_tfidf_cosine_score(resume_text, job_description, extracted_keywords=extracted_keywords)
        tfidf_score = tfidf_analysis.get("score", 0)

        # 2. Keyword Match Percentage (25% weight, reduced from 30%)
        keyword_match_score = tfidf_analysis.get("keyword_match_percentage", 0)

        # 3. Section Completeness (20% weight, increased from 15%)
        structure_analysis = self.analyze_resume_structure(resume_data)
        section_score = structure_analysis["section_score"]

        # 4. Formatting Compatibility (12% weight, increased from 10%)
        formatting_analysis = self.check_formatting_compatibility(resume_data)
        formatting_score = formatting_analysis["score"]

        # 5. Content Quality (8% weight, increased from 5%)
        quality_analysis = self.analyze_content_quality(resume_data)
        quality_score = quality_analysis["score"]

        # Adaptive weighting: balanced approach with conservative keyword emphasis
        if tfidf_score < 40:
            # When TF-IDF is low, emphasize keyword matching conservatively
            tfidf_weight = 0.22
            keyword_weight = 0.35  # Conservative emphasis on keyword additions
            section_weight = 0.20
            formatting_weight = 0.13
            quality_weight = 0.10
        elif tfidf_score < 60:
            # Medium TF-IDF: balanced weights with moderate keyword emphasis
            tfidf_weight = 0.30
            keyword_weight = 0.30  # Moderate emphasis on keyword additions
            section_weight = 0.20
            formatting_weight = 0.12
            quality_weight = 0.08
        else:
            # High TF-IDF: standard weights with balanced keyword weight
            tfidf_weight = 0.35
            keyword_weight = 0.28  # Balanced keyword weight
            section_weight = 0.20
            formatting_weight = 0.10
            quality_weight = 0.07

        # Calculate weighted overall score with adaptive weights
        overall_score = (
            tfidf_score * tfidf_weight
            + keyword_match_score * keyword_weight
            + section_score * section_weight
            + formatting_score * formatting_weight
            + quality_score * quality_weight
        )
        
        # Add conservative bonus for high keyword match percentage
        if keyword_match_score >= 60:
            overall_score += min(5, (keyword_match_score - 60) * 0.125)  # Up to 5 points bonus
        elif keyword_match_score >= 50:
            overall_score += min(3, (keyword_match_score - 50) * 0.3)  # Up to 3 points bonus
        elif keyword_match_score >= 40:
            overall_score += min(2, (keyword_match_score - 40) * 0.2)  # Up to 2 points bonus
        
        # Add conservative bonus for high TF-IDF score
        if tfidf_score >= 50:
            overall_score += min(5, (tfidf_score - 50) * 0.1)  # Up to 5 points bonus
        elif tfidf_score >= 40:
            overall_score += min(3, (tfidf_score - 40) * 0.3)  # Up to 3 points bonus
        
        # Add conservative bonus for having many matching keywords
        matching_count = tfidf_analysis.get("matched_keywords_count", 0)
        if matching_count > 20:
            overall_score += min(4, (matching_count - 20) * 0.2)  # Up to 4 points
        elif matching_count > 15:
            overall_score += min(3, (matching_count - 15) * 0.25)  # Up to 3 points
        elif matching_count > 10:
            overall_score += min(2, (matching_count - 10) * 0.2)  # Up to 2 points
        elif matching_count > 5:
            overall_score += min(1.5, (matching_count - 5) * 0.15)  # Up to 1.5 points

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
        overall_score = (
            structure_analysis["section_score"] * 0.25
            + keyword_analysis["score"] * 0.35
            + quality_analysis["score"] * 0.28
            + formatting_analysis["score"] * 0.12
        )
        
        # More realistic minimum score - only if resume has meaningful content
        if resume_text.strip() and len(resume_data.get("sections", [])) > 0:
            overall_score = max(20, overall_score)  # Reduced from 35 to 20 for more realistic scoring

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
    ) -> Dict[str, Any]:
        """
        Main method to get enhanced ATS compatibility score and AI improvements.
        
        Args:
            resume_data: Resume data dictionary
            job_description: Optional job description for matching
            use_industry_standard: If True, uses TF-IDF + Cosine Similarity (industry standard).
                                  If False, uses custom comprehensive scoring (default).
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

            return {
                "success": True,
                "score": result["overall_score"],
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
