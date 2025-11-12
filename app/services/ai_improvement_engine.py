import re
import json
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum


class ImprovementStrategy(Enum):
    PROFESSIONAL_SUMMARY = "professional_summary"
    QUANTIFIED_ACHIEVEMENTS = "quantified_achievements"
    JOB_ALIGNMENT = "job_alignment"
    CAREER_TRANSITION = "career_transition"
    CONTENT_AUDIT = "content_audit"
    MODERN_FORMAT = "modern_format"
    SKILLS_ENHANCEMENT = "skills_enhancement"
    LEADERSHIP_EMPHASIS = "leadership_emphasis"
    CONTACT_OPTIMIZATION = "contact_optimization"
    ATS_COMPATIBILITY = "ats_compatibility"


@dataclass
class AIImprovement:
    strategy: ImprovementStrategy
    title: str
    description: str
    priority: str  # 'high', 'medium', 'low'
    impact_score: int  # 1-10
    original_text: Optional[str] = None
    improved_text: Optional[str] = None
    reasoning: str = ""
    example: Optional[str] = None


class AIResumeImprovementEngine:
    def __init__(self):
        self.improvement_prompts = {
            ImprovementStrategy.PROFESSIONAL_SUMMARY: {
                "system": "You are an expert resume writer specializing in creating compelling professional summaries. Focus on making summaries concise, engaging, and aligned with job expectations.",
                "user_template": "I'm applying for a {job_title} position in {industry}. Please rewrite this professional summary to make it more concise, engaging, and aligned with the expectations for this role. It should reflect my strengths, relevant skills, and years of experience in a compelling way.\n\nCurrent summary: {current_summary}",
            },
            ImprovementStrategy.QUANTIFIED_ACHIEVEMENTS: {
                "system": "You are an expert at transforming generic job descriptions into results-oriented bullet points with measurable accomplishments.",
                "user_template": "Here are the bullet points for one of my past roles. Please rework them to focus on measurable accomplishments rather than generic responsibilities. Make them results-oriented, use strong action verbs, and include numbers or metrics wherever possible.\n\nRole: {role_title}\nCompany: {company}\nCurrent bullets:\n{current_bullets}",
            },
            ImprovementStrategy.JOB_ALIGNMENT: {
                "system": "You are an expert at optimizing resumes to pass ATS filters while maintaining human readability. Focus on natural keyword integration.",
                "user_template": "I want my resume to pass ATS filters and still read well to human recruiters. Based on this job description, can you help me optimize my resume content to include relevant keywords and phrases from the posting in a natural way?\n\nJob Description:\n{job_description}\n\nCurrent resume content:\n{resume_content}",
            },
            ImprovementStrategy.CAREER_TRANSITION: {
                "system": "You are an expert at helping professionals transition between careers by highlighting transferable skills and making strong cases for career changes.",
                "user_template": "I'm transitioning into a new career from {previous_field} to {new_field}. Please help me rewrite my resume summary and key achievements so they highlight transferable skills and make a strong case for why I'm a great fit, even without direct experience.\n\nCurrent resume:\n{resume_content}",
            },
            ImprovementStrategy.CONTENT_AUDIT: {
                "system": "You are a hiring manager and resume expert. Provide honest feedback on resume content, identifying areas for improvement in tone, structure, and impact.",
                "user_template": "Can you audit this entire resume and point out areas where I'm being too vague, too wordy, or not showing enough impact? I want your feedback on tone, structure, and how I can better emphasize leadership, results, or innovation.\n\nResume:\n{resume_content}",
            },
            ImprovementStrategy.MODERN_FORMAT: {
                "system": "You are a resume design expert specializing in modern, ATS-friendly formats that emphasize recent experience and key skills.",
                "user_template": "Please suggest a better format or layout for my resume that emphasizes my most recent experience and key skills while de-emphasizing older, less relevant roles. I want it to look modern and be easy to scan in under 10 seconds.\n\nCurrent resume:\n{resume_content}",
            },
            ImprovementStrategy.SKILLS_ENHANCEMENT: {
                "system": "You are an expert at creating compelling technical skills sections that stand out to hiring managers.",
                "user_template": "I want to include a section on technical skills and tools, but I'm not sure what to list or how to format it. Based on my experience, can you help me write this section in a way that stands out to hiring managers?\n\nMy experience: {experience_description}\nCurrent skills section: {current_skills}",
            },
            ImprovementStrategy.LEADERSHIP_EMPHASIS: {
                "system": "You are an expert at identifying and highlighting leadership qualities in resumes, even for non-management roles.",
                "user_template": "Please help me identify and emphasize leadership experiences in my resume. I want to show that I can lead, influence, and drive results even if I haven't had a formal management title.\n\nCurrent resume:\n{resume_content}",
            },
            ImprovementStrategy.CONTACT_OPTIMIZATION: {
                "system": "You are an expert at creating compelling resume headlines and contact sections that immediately communicate value proposition.",
                "user_template": "Can you help me write a concise but powerful resume headline and subheadline that immediately tell the reader what type of role I'm seeking, my value proposition, and what makes me stand out?\n\nCurrent headline: {current_headline}\nTarget role: {target_role}\nKey strengths: {key_strengths}",
            },
            ImprovementStrategy.ATS_COMPATIBILITY: {
                "system": "You are a hiring manager in {industry}. Provide honest feedback on what would make you more likely to invite this candidate for an interview.",
                "user_template": "Please act like a hiring manager in {industry}. Based on this resume, what would make you more likely to invite me for an interview? What should I change, cut, or add to improve my chances?\n\nResume:\n{resume_content}\n\nTarget role: {target_role}",
            },
        }

    def extract_keywords_from_job_description(self, job_description: str) -> List[str]:
        """Extract important keywords from job description"""
        if not job_description:
            return []

        # Simple keyword extraction
        words = re.findall(r"\b[A-Za-z]{3,}\b", job_description.lower())

        # Filter out common words
        stop_words = {
            "the",
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
            "is",
            "are",
            "was",
            "were",
            "be",
            "been",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "can",
            "this",
            "that",
            "these",
            "those",
            "a",
            "an",
        }

        keywords = [word for word in words if word not in stop_words and len(word) > 3]

        # Count frequency and return most common
        from collections import Counter

        keyword_counts = Counter(keywords)
        return [word for word, count in keyword_counts.most_common(20)]

    def analyze_resume_for_improvements(
        self,
        resume_data: Dict,
        job_description: str = None,
        target_role: str = None,
        industry: str = None,
    ) -> List[AIImprovement]:
        """Analyze resume and generate improvement suggestions"""
        improvements = []

        # Strategy 1: Professional Summary Enhancement
        current_summary = resume_data.get("summary", "")
        if not current_summary or len(current_summary) < 50:
            improvements.append(
                AIImprovement(
                    strategy=ImprovementStrategy.PROFESSIONAL_SUMMARY,
                    title="Enhance Professional Summary",
                    description="Create a compelling professional summary that highlights your value proposition and aligns with job expectations",
                    priority="high",
                    impact_score=9,
                    original_text=current_summary,
                    reasoning="Professional summaries are the first thing recruiters read and can make or break initial interest",
                    example="Experienced Software Engineer with 5+ years developing scalable web applications using React and Node.js. Proven track record of leading cross-functional teams and delivering projects that increased user engagement by 40%.",
                )
            )

        # Strategy 2: Quantified Achievements Analysis
        text_content = self._extract_text_from_resume(resume_data)
        numbers = re.findall(r"\b\d+(?:\.\d+)?%?\b", text_content)
        if len(numbers) < 3:
            improvements.append(
                AIImprovement(
                    strategy=ImprovementStrategy.QUANTIFIED_ACHIEVEMENTS,
                    title="Add Quantified Achievements",
                    description="Transform generic responsibilities into measurable accomplishments with numbers and metrics",
                    priority="high",
                    impact_score=8,
                    reasoning="Quantified achievements demonstrate concrete impact and value to employers",
                    example="Instead of 'Managed social media accounts', write 'Increased social media engagement by 150% and grew follower base from 1K to 10K in 6 months'",
                )
            )

        # Strategy 3: Job Description Alignment
        if job_description:
            job_keywords = self.extract_keywords_from_job_description(job_description)
            resume_words = set(re.findall(r"\b[A-Za-z]{3,}\b", text_content.lower()))
            missing_keywords = [kw for kw in job_keywords if kw not in resume_words]

            if len(missing_keywords) > 3:
                improvements.append(
                    AIImprovement(
                        strategy=ImprovementStrategy.JOB_ALIGNMENT,
                        title="Align with Job Requirements",
                        description="Incorporate relevant keywords from the job description naturally into your resume",
                        priority="high",
                        impact_score=9,
                        reasoning="ATS systems and recruiters look for specific keywords mentioned in job postings",
                        example=f"Add these job-relevant terms: {', '.join(missing_keywords[:5])}",
                    )
                )

        # Strategy 4: Career Transition Support
        sections = resume_data.get("sections", [])
        experience_section = next(
            (s for s in sections if "experience" in s.get("title", "").lower()), None
        )
        if experience_section and len(experience_section.get("bullets", [])) < 3:
            improvements.append(
                AIImprovement(
                    strategy=ImprovementStrategy.CAREER_TRANSITION,
                    title="Strengthen Experience Section",
                    description="Highlight transferable skills and relevant achievements that apply across industries",
                    priority="medium",
                    impact_score=7,
                    reasoning="Strong experience descriptions help overcome lack of direct industry experience",
                    example="Focus on skills like leadership, problem-solving, project management, and communication that transfer across industries",
                )
            )

        # Strategy 5: Content Quality Audit
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

        if vague_count > 0:
            improvements.append(
                AIImprovement(
                    strategy=ImprovementStrategy.CONTENT_AUDIT,
                    title="Eliminate Vague Language",
                    description="Replace vague, passive language with specific, action-oriented descriptions",
                    priority="medium",
                    impact_score=6,
                    reasoning="Vague language doesn't demonstrate value or impact to employers",
                    example="Instead of 'Responsible for managing projects', write 'Led 5 cross-functional projects resulting in 25% efficiency improvement'",
                )
            )

        # Strategy 6: Modern Format Optimization
        if len(sections) > 6:
            improvements.append(
                AIImprovement(
                    strategy=ImprovementStrategy.MODERN_FORMAT,
                    title="Optimize Resume Length and Focus",
                    description="Streamline resume to focus on most recent and relevant experience",
                    priority="medium",
                    impact_score=5,
                    reasoning="Recruiters spend 6 seconds scanning resumes - focus on what matters most",
                    example="Limit to 1-2 pages and focus on most recent 10 years of experience",
                )
            )

        # Strategy 7: Skills Section Enhancement
        skills_section = next(
            (s for s in sections if "skill" in s.get("title", "").lower()), None
        )
        if not skills_section:
            improvements.append(
                AIImprovement(
                    strategy=ImprovementStrategy.SKILLS_ENHANCEMENT,
                    title="Add Comprehensive Skills Section",
                    description="Create a well-organized skills section with relevant technologies and competencies",
                    priority="high",
                    impact_score=8,
                    reasoning="Skills sections help with ATS keyword matching and show technical competency",
                    example="Technical Skills: Python, JavaScript, React, AWS, Docker, Kubernetes, Git, Agile/Scrum",
                )
            )

        # Strategy 8: Leadership Emphasis
        leadership_keywords = [
            "led",
            "managed",
            "directed",
            "supervised",
            "mentored",
            "coordinated",
            "facilitated",
        ]
        leadership_count = sum(
            1 for word in leadership_keywords if word.lower() in text_content.lower()
        )

        if leadership_count < 2:
            improvements.append(
                AIImprovement(
                    strategy=ImprovementStrategy.LEADERSHIP_EMPHASIS,
                    title="Highlight Leadership Experience",
                    description="Emphasize leadership roles, team management, and influence without authority",
                    priority="medium",
                    impact_score=6,
                    reasoning="Leadership experience is highly valued by employers across all levels",
                    example="Include examples of leading teams, mentoring colleagues, or managing projects",
                )
            )

        # Strategy 9: Contact Information Optimization
        if not resume_data.get("email") or not resume_data.get("phone"):
            improvements.append(
                AIImprovement(
                    strategy=ImprovementStrategy.CONTACT_OPTIMIZATION,
                    title="Complete Contact Information",
                    description="Ensure all contact details are present, professional, and easily accessible",
                    priority="high",
                    impact_score=10,
                    reasoning="Missing contact information prevents employers from reaching you",
                    example="Include professional email, phone number, and LinkedIn profile",
                )
            )

        # Strategy 10: ATS Compatibility
        special_chars = re.findall(r"[^\w\s@.-]", text_content)
        if len(special_chars) > 5:
            improvements.append(
                AIImprovement(
                    strategy=ImprovementStrategy.ATS_COMPATIBILITY,
                    title="Improve ATS Compatibility",
                    description="Remove special characters and optimize formatting for ATS systems",
                    priority="high",
                    impact_score=7,
                    reasoning="ATS systems may not parse special characters correctly",
                    example="Use standard bullet points (•) instead of special symbols and avoid complex formatting",
                )
            )

        return improvements

    def generate_improvement_prompt(
        self,
        strategy: ImprovementStrategy,
        resume_data: Dict,
        job_description: str = None,
        target_role: str = None,
        industry: str = None,
    ) -> str:
        """Generate AI prompt for specific improvement strategy"""
        prompt_config = self.improvement_prompts.get(strategy)
        if not prompt_config:
            return ""

        # Extract relevant data
        current_summary = resume_data.get("summary", "")
        resume_content = self._extract_text_from_resume(resume_data)

        # Build context based on strategy
        context = {
            "job_title": target_role or "your target role",
            "industry": industry or "your industry",
            "current_summary": current_summary,
            "job_description": job_description or "the job description",
            "resume_content": resume_content,
            "target_role": target_role or "your target role",
            "previous_field": "your previous field",
            "new_field": "your new field",
            "experience_description": "your experience",
            "current_skills": "your current skills",
            "current_headline": resume_data.get("title", ""),
            "key_strengths": "your key strengths",
        }

        # Format the prompt
        user_prompt = prompt_config["user_template"].format(**context)

        return f"{prompt_config['system']}\n\n{user_prompt}"

    def _extract_text_from_resume(self, resume_data: Dict) -> str:
        """Extract all text content from resume data"""
        text_parts = []

        # Add basic info
        if resume_data.get("name"):
            text_parts.append(resume_data["name"])
        if resume_data.get("title"):
            text_parts.append(resume_data["title"])
        if resume_data.get("summary"):
            text_parts.append(resume_data["summary"])

        # Add sections
        for section in resume_data.get("sections", []):
            if section.get("title"):
                text_parts.append(section["title"])
            for bullet in section.get("bullets", []):
                if bullet.get("text"):
                    text_parts.append(bullet["text"])

        return " ".join(text_parts)

    def get_improvement_suggestions(
        self,
        resume_data: Dict,
        job_description: str = None,
        target_role: str = None,
        industry: str = None,
    ) -> Dict[str, Any]:
        """Get comprehensive improvement suggestions"""
        improvements = self.analyze_resume_for_improvements(
            resume_data, job_description, target_role, industry
        )

        # Categorize by priority
        high_priority = [imp for imp in improvements if imp.priority == "high"]
        medium_priority = [imp for imp in improvements if imp.priority == "medium"]
        low_priority = [imp for imp in improvements if imp.priority == "low"]

        # Generate AI prompts for each improvement
        ai_prompts = {}
        for improvement in improvements:
            ai_prompts[improvement.strategy.value] = self.generate_improvement_prompt(
                improvement.strategy,
                resume_data,
                job_description,
                target_role,
                industry,
            )

        return {
            "success": True,
            "total_improvements": len(improvements),
            "high_priority": [
                {
                    "strategy": imp.strategy.value,
                    "title": imp.title,
                    "description": imp.description,
                    "impact_score": imp.impact_score,
                    "reasoning": imp.reasoning,
                    "example": imp.example,
                    "ai_prompt": ai_prompts.get(imp.strategy.value, ""),
                }
                for imp in high_priority
            ],
            "medium_priority": [
                {
                    "strategy": imp.strategy.value,
                    "title": imp.title,
                    "description": imp.description,
                    "impact_score": imp.impact_score,
                    "reasoning": imp.reasoning,
                    "example": imp.example,
                    "ai_prompt": ai_prompts.get(imp.strategy.value, ""),
                }
                for imp in medium_priority
            ],
            "low_priority": [
                {
                    "strategy": imp.strategy.value,
                    "title": imp.title,
                    "description": imp.description,
                    "impact_score": imp.impact_score,
                    "reasoning": imp.reasoning,
                    "example": imp.example,
                    "ai_prompt": ai_prompts.get(imp.strategy.value, ""),
                }
                for imp in low_priority
            ],
            "all_improvements": [
                {
                    "strategy": imp.strategy.value,
                    "title": imp.title,
                    "description": imp.description,
                    "priority": imp.priority,
                    "impact_score": imp.impact_score,
                    "reasoning": imp.reasoning,
                    "example": imp.example,
                    "ai_prompt": ai_prompts.get(imp.strategy.value, ""),
                }
                for imp in improvements
            ],
        }
