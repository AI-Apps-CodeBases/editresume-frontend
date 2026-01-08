import logging
import re
from collections import Counter

logger = logging.getLogger(__name__)


class KeywordExtractor:
    def __init__(self):
        # Simple stop words list - expanded to match extension improvements
        self.stop_words = {
            "a",
            "an",
            "and",
            "are",
            "as",
            "at",
            "be",
            "by",
            "for",
            "from",
            "has",
            "he",
            "in",
            "is",
            "it",
            "its",
            "of",
            "on",
            "that",
            "the",
            "to",
            "was",
            "will",
            "with",
            "this",
            "these",
            "they",
            "them",
            "their",
            # Additional generic job posting words
            "opportunity",
            "opportunities",
            "position",
            "positions",
            "join",
            "seeking",
            "hiring",
            "apply",
            "applicant",
            "applicants",
            "job",
            "jobs",
            "career",
            "careers",
            "employment",
            "employed",
            "employee",
            "employees",
            "description",
            "posting",
            "opening",
            "openings",
            "vacancy",
            "vacancies",
            "offer",
            "offers",
            "provide",
            "provides",
            "providing",
            "day",
            "days",
            "week",
            "weeks",
            "month",
            "months",
            "time",
            "times",
            "people",
            "person",
            "individual",
            "individuals",
            "successful",
            "success",
            "ideal",
            "perfect",
            "best",
            "top",
            "leading",
            "premier",
            "world",
            "class",
            "award",
            "winning",
            "innovative",
            "dynamic",
            "growing",
            "established",
            "well",
            "known",
            "recognized",
            "industry",
            "industries",
            "sector",
            "sectors",
            "field",
            "fields",
            "candidate",
            "candidates",
            "looking",
            "work",
            "team",
            "role",
            "company",
            "you",
            "your",
            "our",
            "can",
            "able",
            "have",
            "had",
            "should",
            "must",
            "could",
            "would",
            "also",
            "ensure",
            "using",
            "use",
            "make",
            "year",
            "years",
            "plus",
            "nice",
            "preferred",
            "strong",
            "excellent",
            "great",
            "good",
            "fast",
            "paced",
            "environment",
            "responsible",
            "responsibilities",
            "requirements",
            "requirement",
            "qualification",
            "qualifications",
            "skills",
            "experience",
            "experiences",
        }

        # Common technical skills and keywords
        self.technical_keywords = {
            "programming_languages": [
                "python",
                "java",
                "javascript",
                "typescript",
                "c++",
                "c#",
                "go",
                "rust",
                "php",
                "ruby",
                "swift",
                "kotlin",
                "scala",
                "r",
                "matlab",
                "sql",
            ],
            "frameworks": [
                "react",
                "angular",
                "vue",
                "node.js",
                "django",
                "flask",
                "spring",
                "express",
                "laravel",
                "rails",
                "asp.net",
                "fastapi",
            ],
            "databases": [
                "mysql",
                "postgresql",
                "mongodb",
                "redis",
                "elasticsearch",
                "cassandra",
                "oracle",
                "sqlite",
                "dynamodb",
                "neo4j",
            ],
            "cloud_platforms": [
                "aws",
                "azure",
                "gcp",
                "google cloud",
                "amazon web services",
                "microsoft azure",
                "kubernetes",
                "docker",
            ],
            "tools": [
                "git",
                "jenkins",
                "terraform",
                "ansible",
                "kubernetes",
                "docker",
                "jira",
                "confluence",
                "slack",
                "github",
                "gitlab",
                "bitbucket",
            ],
            "methodologies": [
                "agile",
                "scrum",
                "kanban",
                "devops",
                "ci/cd",
                "microservices",
                "api",
                "rest",
                "graphql",
                "test driven development",
                "tdd",
            ],
        }

        # Soft skills commonly found in job descriptions
        self.soft_skills = {
            "communication": [
                "communication",
                "verbal",
                "written",
                "presentation",
                "public speaking",
                "interpersonal",
                "negotiation",
                "persuasion",
                "influencing",
                "articulate",
            ],
            "leadership": [
                "leadership",
                "leading",
                "mentoring",
                "coaching",
                "managing",
                "supervising",
                "team building",
                "delegation",
                "decision making",
                "strategic thinking",
            ],
            "collaboration": [
                "collaboration",
                "teamwork",
                "cross-functional",
                "stakeholder",
                "partnership",
                "coordination",
                "cooperation",
                "synergy",
            ],
            "problem_solving": [
                "problem solving",
                "analytical",
                "critical thinking",
                "troubleshooting",
                "root cause",
                "debugging",
                "investigation",
                "analysis",
            ],
            "adaptability": [
                "adaptability",
                "flexible",
                "agile",
                "versatile",
                "resilient",
                "open-minded",
                "change management",
                "learning",
                "continuous improvement",
            ],
            "organization": [
                "organization",
                "time management",
                "prioritization",
                "multitasking",
                "project management",
                "planning",
                "scheduling",
                "efficiency",
            ],
            "creativity": [
                "creativity",
                "innovation",
                "creative",
                "innovative",
                "design thinking",
                "brainstorming",
                "ideation",
                "conceptualization",
            ],
            "attention_to_detail": [
                "attention to detail",
                "detail-oriented",
                "meticulous",
                "precision",
                "accuracy",
                "quality",
                "thorough",
                "precision",
            ],
            "work_ethic": [
                "work ethic",
                "dedicated",
                "committed",
                "reliable",
                "dependable",
                "proactive",
                "self-motivated",
                "initiative",
                "drive",
            ],
            "customer_focus": [
                "customer focus",
                "customer service",
                "client-facing",
                "user experience",
                "customer satisfaction",
                "stakeholder management",
            ],
        }

        # ATS-relevant keywords
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
                "designed",
                "developed",
                "engineered",
                "executed",
                "implemented",
                "improved",
                "increased",
                "launched",
                "led",
                "managed",
                "optimized",
                "orchestrated",
                "produced",
                "reduced",
                "resolved",
                "scaled",
                "streamlined",
                "transformed",
                "utilized",
                "automated",
                "deployed",
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
                "uptime",
                "availability",
                "latency",
                "throughput",
                "scalability",
                "capacity",
            ],
            "industry_terms": [
                "best practices",
                "industry standards",
                "compliance",
                "security",
                "governance",
                "sla",
                "qos",
                "disaster recovery",
                "business continuity",
                "risk management",
            ],
        }

        # Flatten all technical keywords
        self.all_technical_keywords = set()
        for category, keywords in self.technical_keywords.items():
            self.all_technical_keywords.update(keywords)

    def extract_ats_focused_keywords(self, text: str) -> list[str]:
        """Extract ATS-focused keywords: education, experience, certifications"""
        if not text:
            return []

        ats_keywords = set()

        # Extract education requirements (e.g., "Bachelor's degree in Computer Science")
        education_patterns = [
            r'\b(bachelor\'?s?|master\'?s?|phd|doctorate|mba)\s+(?:degree\s+)?(?:in\s+)?([a-z\s]+?)(?=\s*(?:or|and|,|\.|required|preferred|from|$))',
            r'\b(bachelor\'?s?|master\'?s?|phd|doctorate|mba)\b'
        ]

        for pattern in education_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                # Check if we have a second group (field of study)
                if len(match.groups()) >= 2 and match.group(2):
                    if len(match.group(2).strip()) > 3 and len(match.group(2).strip()) < 50:
                        clean_field = match.group(2).strip()
                        # Filter out generic words
                        if not re.search(r'(degree|required|preferred|equivalent|related)$', clean_field, re.IGNORECASE):
                            ats_keywords.add(f"{match.group(1)} {clean_field}".title())
                # Always add the degree itself
                if match.group(1):
                    ats_keywords.add(match.group(1).title())

        # Extract years of experience (e.g., "5+ years experience")
        exp_pattern = r'(\d+\+?)\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)(?:\s+(?:in|with)\s+([a-z\s/+#.]+?))?(?=\s*(?:,|\.|;|required|preferred|or|and|$))'
        exp_matches = re.finditer(exp_pattern, text, re.IGNORECASE)
        for match in exp_matches:
            # Check if we have a skill specified
            if len(match.groups()) >= 2 and match.group(2):
                if len(match.group(2).strip()) > 2:
                    skill = match.group(2).strip()
                    if len(skill) < 40:
                        ats_keywords.add(f"{match.group(1)}+ years {skill.title()}")
            else:
                ats_keywords.add(f"{match.group(1)}+ years experience")

        # Extract certifications (e.g., "AWS Certified", "PMP Certification")
                ats_keywords.add(cert.strip())

        return list(ats_keywords)

    def extract_keywords(self, text: str) -> dict[str, any]:
        """Extract keywords from text using multiple methods"""
        if not text or not text.strip():
            return {
                "technical_keywords": [],
                "general_keywords": [],
                "ats_focused_keywords": [],  # New field
                "soft_skills": [],
                "high_frequency_keywords": [],
                "ats_keywords": {
                    "action_verbs": [],
                    "metrics": [],
                    "industry_terms": [],
                },
                "keyword_frequency": {},
                "total_keywords": 0,
            }

        # Clean and preprocess text
        cleaned_text = self._clean_text(text)

        # Extract ATS-focused keywords (education, experience, certifications)
        ats_focused = self.extract_ats_focused_keywords(text)

        # Extract technical keywords
        technical_keywords = self._extract_technical_keywords(cleaned_text)

        # Extract soft skills
        soft_skills = self._extract_soft_skills(cleaned_text)

        # Extract ATS keywords
        ats_keywords = self._extract_ats_keywords(cleaned_text)

        # Extract general keywords using frequency analysis
        general_keywords = self._extract_general_keywords(cleaned_text)

        # Combine ATS-focused keywords with general keywords, prioritizing ATS
        # This ensures education, experience, and certifications appear first
        combined_general = list(dict.fromkeys(ats_focused + general_keywords))[:20]

        # Get high-frequency keywords (most important for ATS)
        high_frequency_keywords = self._extract_high_frequency_keywords(cleaned_text)

        # Combine and get frequency
        all_keywords = technical_keywords + combined_general + soft_skills
        keyword_frequency = Counter(all_keywords)

        return {
            "technical_keywords": technical_keywords,
            "general_keywords": combined_general,  # Now includes ATS-focused keywords
            "ats_focused_keywords": ats_focused,  # New field for ATS-specific keywords
            "soft_skills": soft_skills,
            "high_frequency_keywords": high_frequency_keywords,
            "ats_keywords": ats_keywords,
            "keyword_frequency": dict(keyword_frequency),
            "total_keywords": len(all_keywords),
        }

    def _clean_text(self, text: str) -> str:
        """Clean and preprocess text"""
        # Remove extra whitespace
        text = re.sub(r"\s+", " ", text)

        # Remove special characters but keep alphanumeric and spaces
        text = re.sub(r"[^\w\s]", " ", text)

        # Convert to lowercase
        text = text.lower()

        return text.strip()

    def _normalize_identifier(self, value: str) -> str:
        """Normalize identifiers for comparison by stripping separators."""
        return re.sub(r"[\s\-/\\.+]", "", value.lower())

    def _extract_technical_keywords(self, text: str) -> list[str]:
        """Extract technical keywords from text"""
        if not text:
            return []

        found_keywords = []
        raw_text = text.lower()
        normalized_text = self._normalize_identifier(text)

        for category, keywords in self.technical_keywords.items():
            for keyword in keywords:
                keyword_lower = keyword.lower()
                # Use word boundary matching to avoid partial matches
                # Match as whole word or with separators (/, -, ., etc.)
                pattern = r'\b' + re.escape(keyword_lower) + r'\b'
                if re.search(pattern, raw_text):
                    found_keywords.append(keyword)
                    continue

                # For keywords with special chars (like "c++", "node.js"), check normalized
                normalized_keyword = self._normalize_identifier(keyword_lower)
                if normalized_keyword and len(normalized_keyword) > 2:
                    # Only match if it's a significant portion (not just 1-2 chars)
                    normalized_pattern = re.escape(normalized_keyword)
                    if re.search(normalized_pattern, normalized_text):
                        found_keywords.append(keyword)

        return list(set(found_keywords))

    def _extract_general_keywords(self, text: str) -> list[str]:
        """Extract general keywords using simple frequency analysis"""
        try:
            # Extract tokens but filter out pure numbers and numeric strings
            tokens = re.findall(r"\b[a-zA-Z0-9][a-zA-Z0-9+/.-]{1,}\b", text.lower())

            filtered_words = []
            for token in tokens:
                # Filter out pure numbers (e.g., "5", "2024", "10")
                if re.match(r'^\d+$', token):
                    continue

                # Filter out numeric strings with suffixes (e.g., "5+", "10+", "2024-2025")
                if re.match(r'^\d+[+\-%]?$', token) or re.match(r'^\d+-\d+$', token):
                    continue

                # Filter out tokens that are mostly numbers (e.g., "5years", "10+")
                if re.search(r'^\d+', token) and len(re.sub(r'\d', '', token)) < 2:
                    continue

                # Must have at least 3 characters for non-technical terms (increased from 2)
                if len(token) < 3:
                    continue

                # Filter out common non-technical job posting words
                if token in self.stop_words:
                    continue

                # Filter out technical keywords (they're handled separately)
                if token in self.all_technical_keywords:
                    continue

                # Additional filtering: skip if token is just a number with a word (e.g., "5years" -> skip)
                # But allow technical terms like "c++", "c#", etc.
                if re.match(r'^\d+[a-z]+$', token) and len(token) < 6:
                    continue

                filtered_words.append(token)

            word_counts = Counter(filtered_words)

            # Return top 20 keywords (reduced from 40 for more focused results)
            return [word for word, _ in word_counts.most_common(20)]

        except Exception as e:
            logger.error(f"Error extracting general keywords: {e}")
            return []

    def _extract_soft_skills(self, text: str) -> list[str]:
        """Extract soft skills from text"""
        found_skills = []

        for category, skills in self.soft_skills.items():
            for skill in skills:
                # Check for exact matches and variations
                skill_lower = skill.lower()
                if skill_lower in text or skill_lower.replace("-", " ").replace("_", " ") in text or re.search(r"\b" + re.escape(skill_lower) + r"\b", text):
                    found_skills.append(skill)

        return list(set(found_skills))

    def _extract_ats_keywords(self, text: str) -> dict[str, list[str]]:
        """Extract ATS-relevant keywords"""
        result = {"action_verbs": [], "metrics": [], "industry_terms": []}

        for category, keywords in self.ats_keywords.items():
            for keyword in keywords:
                keyword_lower = keyword.lower()
                # Check for exact matches
                if keyword_lower in text or re.search(r"\b" + re.escape(keyword_lower) + r"\b", text):
                    result[category].append(keyword)

        # Remove duplicates
        for category in result:
            result[category] = list(set(result[category]))

        return result

    def _extract_high_frequency_keywords(
        self, cleaned_text: str
    ) -> list[dict[str, any]]:
        """Extract high-frequency keywords that are most important for ATS"""
        try:
            tokens = re.findall(
                r"\b[a-zA-Z0-9][a-zA-Z0-9+/.-]{1,}\b", cleaned_text.lower()
            )

            bigrams = [f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens) - 1)]

            # Combine and count
            all_terms = tokens + bigrams
            term_counts = Counter(all_terms)

            # Filter out stop words and very common terms
            filtered_terms = []
            for term, count in term_counts.most_common(30):
                if term in self.stop_words:
                    continue
                compact = term.replace(" ", "")
                if len(compact) < 2:
                    continue

                filtered_terms.append(
                    {
                        "keyword": term,
                        "frequency": count,
                        "importance": (
                            "high" if count >= 3 else "medium" if count == 2 else "low"
                        ),
                    }
                )

            # Sort by frequency and return top 20
            filtered_terms.sort(key=lambda x: x["frequency"], reverse=True)
            return filtered_terms[:20]

        except Exception as e:
            logger.error(f"Error extracting high-frequency keywords: {e}")
            return []

    def calculate_similarity(
        self, job_description: str, resume_text: str
    ) -> dict[str, any]:
        """Calculate similarity between job description and resume"""
        try:

            def normalize_collection(values):
                if not values:
                    return set()
                return {
                    value.strip().lower()
                    for value in values
                    if isinstance(value, str) and value.strip()
                }

            def normalize_high_frequency(values):
                if not values:
                    return set()
                return {
                    item.get("keyword", "").strip().lower()
                    for item in values
                    if isinstance(item, dict)
                    and isinstance(item.get("keyword"), str)
                    and item.get("keyword").strip()
                }

            # Extract keywords from both texts
            job_keywords = self.extract_keywords(job_description)
            resume_keywords = self.extract_keywords(resume_text)

            # Normalize keyword buckets
            job_technical = normalize_collection(job_keywords["technical_keywords"])
            resume_technical = normalize_collection(
                resume_keywords["technical_keywords"]
            )

            job_general = normalize_collection(job_keywords["general_keywords"])
            resume_general = normalize_collection(resume_keywords["general_keywords"])

            job_soft = normalize_collection(job_keywords.get("soft_skills", []))
            resume_soft = normalize_collection(resume_keywords.get("soft_skills", []))

            job_high_freq = normalize_high_frequency(
                job_keywords.get("high_frequency_keywords")
            )
            resume_high_freq = normalize_high_frequency(
                resume_keywords.get("high_frequency_keywords")
            )

            # Combine all keywords for comparison
            job_all_keywords = job_technical | job_general | job_soft | job_high_freq
            resume_all_keywords = (
                resume_technical | resume_general | resume_soft | resume_high_freq
            )

            # Find matching keywords
            matching_keywords = job_all_keywords.intersection(resume_all_keywords)

            # Find missing keywords (in job description but not in resume)
            missing_keywords = job_all_keywords - resume_all_keywords

            # Calculate similarity score
            if len(job_all_keywords) == 0:
                similarity_score = 0.0
            else:
                similarity_score = len(matching_keywords) / len(job_all_keywords)

            # Calculate technical keyword match
            technical_matches = job_technical.intersection(resume_technical)
            technical_missing = job_technical - resume_technical

            technical_score = (
                len(technical_matches) / len(job_technical)
                if len(job_technical) > 0
                else 0.0
            )

            # Prioritize missing keywords: technical > ATS-focused > soft skills > general
            # This ensures Match JD shows the most important keywords first
            missing_technical = technical_missing
            missing_soft = job_soft - resume_soft

            # Get ATS-focused keywords that are missing
            job_ats_focused = normalize_collection(job_keywords.get("ats_focused_keywords", []))
            resume_ats_focused = normalize_collection(resume_keywords.get("ats_focused_keywords", []))
            missing_ats_focused = job_ats_focused - resume_ats_focused

            # Get general keywords that are missing (but exclude ones already in technical/ATS/soft)
            missing_general = missing_keywords - missing_technical - missing_ats_focused - missing_soft

            # Combine in priority order: technical, ATS-focused, soft skills, then general
            prioritized_missing = (
                list(missing_technical) +
                list(missing_ats_focused) +
                list(missing_soft) +
                list(missing_general)
            )

            # Debug logging
            logger.info("Keyword extraction summary:")
            logger.info(f"  Total job keywords: {len(job_all_keywords)}")
            logger.info(f"  Missing technical: {len(missing_technical)}")
            logger.info(f"  Missing ATS-focused: {len(missing_ats_focused)}")
            logger.info(f"  Missing soft skills: {len(missing_soft)}")
            logger.info(f"  Missing general: {len(missing_general)}")
            logger.info(f"  Total prioritized missing: {len(prioritized_missing)}")
            if len(prioritized_missing) > 0:
                logger.info(f"  First 10 missing: {prioritized_missing[:10]}")

            return {
                "similarity_score": round(similarity_score * 100, 2),
                "technical_score": round(technical_score * 100, 2),
                "matching_keywords": list(matching_keywords),
                "missing_keywords": prioritized_missing,  # Now prioritized
                "technical_matches": list(technical_matches),
                "technical_missing": list(technical_missing),
                "total_job_keywords": len(job_all_keywords),
                "total_resume_keywords": len(resume_all_keywords),
                "match_count": len(matching_keywords),
                "missing_count": len(missing_keywords),
            }

        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return {
                "similarity_score": 0.0,
                "technical_score": 0.0,
                "matching_keywords": [],
                "missing_keywords": [],
                "technical_matches": [],
                "technical_missing": [],
                "total_job_keywords": 0,
                "total_resume_keywords": 0,
                "match_count": 0,
                "missing_count": 0,
                "error": str(e),
            }

    def get_keyword_suggestions(
        self, missing_keywords: list[str]
    ) -> dict[str, list[str]]:
        """Get suggestions for missing keywords"""
        suggestions = {}

        for keyword in missing_keywords:
            keyword_lower = keyword.lower()
            suggestions[keyword] = []

            # Find related keywords in our technical keywords
            for category, keywords in self.technical_keywords.items():
                for tech_keyword in keywords:
                    if (
                        keyword_lower in tech_keyword
                        or tech_keyword in keyword_lower
                        or self._are_related(keyword_lower, tech_keyword)
                    ):
                        suggestions[keyword].append(tech_keyword)

            # Limit suggestions to top 3
            suggestions[keyword] = suggestions[keyword][:3]

        return suggestions

    def _are_related(self, word1: str, word2: str) -> bool:
        """Check if two words are related (simple implementation)"""
        # Remove common suffixes and check similarity
        word1_clean = re.sub(r"(ing|ed|s|er|est)$", "", word1)
        word2_clean = re.sub(r"(ing|ed|s|er|est)$", "", word2)

        return (
            word1_clean in word2_clean
            or word2_clean in word1_clean
            or word1_clean == word2_clean
        )
