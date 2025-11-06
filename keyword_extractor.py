import re
import logging
from typing import List, Dict, Set, Tuple
from collections import Counter
import math

logger = logging.getLogger(__name__)

class KeywordExtractor:
    def __init__(self):
        # Simple stop words list
        self.stop_words = {
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it', 'its',
            'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with', 'the', 'this', 'these', 'they', 'them', 'their'
        }
        
        # Common technical skills and keywords
        self.technical_keywords = {
            'programming_languages': [
                'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust', 
                'php', 'ruby', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'sql'
            ],
            'frameworks': [
                'react', 'angular', 'vue', 'node.js', 'django', 'flask', 'spring', 
                'express', 'laravel', 'rails', 'asp.net', 'fastapi'
            ],
            'databases': [
                'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra',
                'oracle', 'sqlite', 'dynamodb', 'neo4j'
            ],
            'cloud_platforms': [
                'aws', 'azure', 'gcp', 'google cloud', 'amazon web services',
                'microsoft azure', 'kubernetes', 'docker'
            ],
            'tools': [
                'git', 'jenkins', 'terraform', 'ansible', 'kubernetes', 'docker',
                'jira', 'confluence', 'slack', 'github', 'gitlab', 'bitbucket'
            ],
            'methodologies': [
                'agile', 'scrum', 'kanban', 'devops', 'ci/cd', 'microservices',
                'api', 'rest', 'graphql', 'test driven development', 'tdd'
            ]
        }
        
        # Soft skills commonly found in job descriptions
        self.soft_skills = {
            'communication': [
                'communication', 'verbal', 'written', 'presentation', 'public speaking',
                'interpersonal', 'negotiation', 'persuasion', 'influencing', 'articulate'
            ],
            'leadership': [
                'leadership', 'leading', 'mentoring', 'coaching', 'managing', 'supervising',
                'team building', 'delegation', 'decision making', 'strategic thinking'
            ],
            'collaboration': [
                'collaboration', 'teamwork', 'cross-functional', 'stakeholder', 'partnership',
                'coordination', 'cooperation', 'synergy'
            ],
            'problem_solving': [
                'problem solving', 'analytical', 'critical thinking', 'troubleshooting',
                'root cause', 'debugging', 'investigation', 'analysis'
            ],
            'adaptability': [
                'adaptability', 'flexible', 'agile', 'versatile', 'resilient', 'open-minded',
                'change management', 'learning', 'continuous improvement'
            ],
            'organization': [
                'organization', 'time management', 'prioritization', 'multitasking',
                'project management', 'planning', 'scheduling', 'efficiency'
            ],
            'creativity': [
                'creativity', 'innovation', 'creative', 'innovative', 'design thinking',
                'brainstorming', 'ideation', 'conceptualization'
            ],
            'attention_to_detail': [
                'attention to detail', 'detail-oriented', 'meticulous', 'precision',
                'accuracy', 'quality', 'thorough', 'precision'
            ],
            'work_ethic': [
                'work ethic', 'dedicated', 'committed', 'reliable', 'dependable',
                'proactive', 'self-motivated', 'initiative', 'drive'
            ],
            'customer_focus': [
                'customer focus', 'customer service', 'client-facing', 'user experience',
                'customer satisfaction', 'stakeholder management'
            ]
        }
        
        # ATS-relevant keywords
        self.ats_keywords = {
            'action_verbs': [
                'achieved', 'accomplished', 'administered', 'analyzed', 'architected', 'built',
                'collaborated', 'created', 'delivered', 'designed', 'developed', 'engineered',
                'executed', 'implemented', 'improved', 'increased', 'launched', 'led',
                'managed', 'optimized', 'orchestrated', 'produced', 'reduced', 'resolved',
                'scaled', 'streamlined', 'transformed', 'utilized', 'automated', 'deployed'
            ],
            'metrics': [
                'percent', '%', 'increase', 'decrease', 'reduction', 'improvement',
                'efficiency', 'performance', 'cost', 'revenue', 'profit', 'uptime',
                'availability', 'latency', 'throughput', 'scalability', 'capacity'
            ],
            'industry_terms': [
                'best practices', 'industry standards', 'compliance', 'security', 'governance',
                'sla', 'qos', 'disaster recovery', 'business continuity', 'risk management'
            ]
        }
        
        # Flatten all technical keywords
        self.all_technical_keywords = set()
        for category, keywords in self.technical_keywords.items():
            self.all_technical_keywords.update(keywords)
    
    def extract_keywords(self, text: str) -> Dict[str, any]:
        """Extract keywords from text using multiple methods"""
        if not text or not text.strip():
            return {
                'technical_keywords': [],
                'general_keywords': [],
                'soft_skills': [],
                'high_frequency_keywords': [],
                'ats_keywords': {
                    'action_verbs': [],
                    'metrics': [],
                    'industry_terms': []
                },
                'keyword_frequency': {},
                'total_keywords': 0
            }
        
        # Clean and preprocess text
        cleaned_text = self._clean_text(text)
        
        # Extract technical keywords
        technical_keywords = self._extract_technical_keywords(cleaned_text)
        
        # Extract soft skills
        soft_skills = self._extract_soft_skills(cleaned_text)
        
        # Extract ATS keywords
        ats_keywords = self._extract_ats_keywords(cleaned_text)
        
        # Extract general keywords using frequency analysis
        general_keywords = self._extract_general_keywords(cleaned_text)
        
        # Get high-frequency keywords (most important for ATS)
        high_frequency_keywords = self._extract_high_frequency_keywords(cleaned_text)
        
        # Combine and get frequency
        all_keywords = technical_keywords + general_keywords + soft_skills
        keyword_frequency = Counter(all_keywords)
        
        return {
            'technical_keywords': technical_keywords,
            'general_keywords': general_keywords,
            'soft_skills': soft_skills,
            'high_frequency_keywords': high_frequency_keywords,
            'ats_keywords': ats_keywords,
            'keyword_frequency': dict(keyword_frequency),
            'total_keywords': len(all_keywords)
        }
    
    def _clean_text(self, text: str) -> str:
        """Clean and preprocess text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters but keep alphanumeric and spaces
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Convert to lowercase
        text = text.lower()
        
        return text.strip()
    
    def _extract_technical_keywords(self, text: str) -> List[str]:
        """Extract technical keywords from text"""
        found_keywords = []
        
        for category, keywords in self.technical_keywords.items():
            for keyword in keywords:
                # Check for exact matches and variations
                if keyword in text:
                    found_keywords.append(keyword)
                # Check for variations (e.g., "Node.js" vs "nodejs")
                elif keyword.replace('.', '').replace('-', '') in text.replace('.', '').replace('-', ''):
                    found_keywords.append(keyword)
        
        return list(set(found_keywords))
    
    def _extract_general_keywords(self, text: str) -> List[str]:
        """Extract general keywords using simple frequency analysis"""
        try:
            # Clean and tokenize text
            words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
            
            # Remove stop words and technical keywords
            filtered_words = []
            for word in words:
                if (word not in self.stop_words and 
                    word not in self.all_technical_keywords and
                    len(word) > 2):
                    filtered_words.append(word)
            
            # Count word frequencies
            word_counts = Counter(filtered_words)
            
            # Get top keywords by frequency
            top_keywords = [word for word, count in word_counts.most_common(15) if count > 1]
            
            return top_keywords
            
        except Exception as e:
            logger.error(f"Error extracting general keywords: {e}")
            return []
    
    def _extract_soft_skills(self, text: str) -> List[str]:
        """Extract soft skills from text"""
        found_skills = []
        
        for category, skills in self.soft_skills.items():
            for skill in skills:
                # Check for exact matches and variations
                skill_lower = skill.lower()
                if skill_lower in text:
                    found_skills.append(skill)
                # Check for variations (e.g., "problem-solving" vs "problem solving")
                elif skill_lower.replace('-', ' ').replace('_', ' ') in text:
                    found_skills.append(skill)
                # Check for word boundaries
                elif re.search(r'\b' + re.escape(skill_lower) + r'\b', text):
                    found_skills.append(skill)
        
        return list(set(found_skills))
    
    def _extract_ats_keywords(self, text: str) -> Dict[str, List[str]]:
        """Extract ATS-relevant keywords"""
        result = {
            'action_verbs': [],
            'metrics': [],
            'industry_terms': []
        }
        
        for category, keywords in self.ats_keywords.items():
            for keyword in keywords:
                keyword_lower = keyword.lower()
                # Check for exact matches
                if keyword_lower in text:
                    result[category].append(keyword)
                # Check with word boundaries
                elif re.search(r'\b' + re.escape(keyword_lower) + r'\b', text):
                    result[category].append(keyword)
        
        # Remove duplicates
        for category in result:
            result[category] = list(set(result[category]))
        
        return result
    
    def _extract_high_frequency_keywords(self, cleaned_text: str) -> List[Dict[str, any]]:
        """Extract high-frequency keywords that are most important for ATS"""
        try:
            # Extract both single words and bigrams
            words = re.findall(r'\b[a-zA-Z]{4,}\b', cleaned_text.lower())
            
            # Extract bigrams (two-word phrases)
            bigrams = []
            word_list = words
            for i in range(len(word_list) - 1):
                bigram = f"{word_list[i]} {word_list[i+1]}"
                bigrams.append(bigram)
            
            # Combine and count
            all_terms = words + bigrams
            term_counts = Counter(all_terms)
            
            # Filter out stop words and very common terms
            filtered_terms = []
            for term, count in term_counts.most_common(30):
                # Skip if it's a stop word or too generic
                if (term not in self.stop_words and 
                    len(term) > 3 and
                    count > 1):
                    # Check if it's a meaningful term (not just filler)
                    if not any(word in term for word in ['this', 'that', 'with', 'from', 'have', 'will']):
                        filtered_terms.append({
                            'keyword': term,
                            'frequency': count,
                            'importance': 'high' if count > 3 else 'medium'
                        })
            
            # Sort by frequency and return top 20
            filtered_terms.sort(key=lambda x: x['frequency'], reverse=True)
            return filtered_terms[:20]
            
        except Exception as e:
            logger.error(f"Error extracting high-frequency keywords: {e}")
            return []
    
    def calculate_similarity(self, job_description: str, resume_text: str) -> Dict[str, any]:
        """Calculate similarity between job description and resume"""
        try:
            # Extract keywords from both texts
            job_keywords = self.extract_keywords(job_description)
            resume_keywords = self.extract_keywords(resume_text)
            
            # Combine all keywords for comparison
            job_all_keywords = set(job_keywords['technical_keywords'] + job_keywords['general_keywords'])
            resume_all_keywords = set(resume_keywords['technical_keywords'] + resume_keywords['general_keywords'])
            
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
            job_technical = set(job_keywords['technical_keywords'])
            resume_technical = set(resume_keywords['technical_keywords'])
            technical_matches = job_technical.intersection(resume_technical)
            technical_missing = job_technical - resume_technical
            
            technical_score = len(technical_matches) / len(job_technical) if len(job_technical) > 0 else 0.0
            
            return {
                'similarity_score': round(similarity_score * 100, 2),
                'technical_score': round(technical_score * 100, 2),
                'matching_keywords': list(matching_keywords),
                'missing_keywords': list(missing_keywords),
                'technical_matches': list(technical_matches),
                'technical_missing': list(technical_missing),
                'total_job_keywords': len(job_all_keywords),
                'total_resume_keywords': len(resume_all_keywords),
                'match_count': len(matching_keywords),
                'missing_count': len(missing_keywords)
            }
            
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return {
                'similarity_score': 0.0,
                'technical_score': 0.0,
                'matching_keywords': [],
                'missing_keywords': [],
                'technical_matches': [],
                'technical_missing': [],
                'total_job_keywords': 0,
                'total_resume_keywords': 0,
                'match_count': 0,
                'missing_count': 0,
                'error': str(e)
            }
    
    def get_keyword_suggestions(self, missing_keywords: List[str]) -> Dict[str, List[str]]:
        """Get suggestions for missing keywords"""
        suggestions = {}
        
        for keyword in missing_keywords:
            keyword_lower = keyword.lower()
            suggestions[keyword] = []
            
            # Find related keywords in our technical keywords
            for category, keywords in self.technical_keywords.items():
                for tech_keyword in keywords:
                    if (keyword_lower in tech_keyword or 
                        tech_keyword in keyword_lower or
                        self._are_related(keyword_lower, tech_keyword)):
                        suggestions[keyword].append(tech_keyword)
            
            # Limit suggestions to top 3
            suggestions[keyword] = suggestions[keyword][:3]
        
        return suggestions
    
    def _are_related(self, word1: str, word2: str) -> bool:
        """Check if two words are related (simple implementation)"""
        # Remove common suffixes and check similarity
        word1_clean = re.sub(r'(ing|ed|s|er|est)$', '', word1)
        word2_clean = re.sub(r'(ing|ed|s|er|est)$', '', word2)
        
        return (word1_clean in word2_clean or 
                word2_clean in word1_clean or
                word1_clean == word2_clean)
