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
                'keyword_frequency': {},
                'total_keywords': 0
            }
        
        # Clean and preprocess text
        cleaned_text = self._clean_text(text)
        
        # Extract technical keywords
        technical_keywords = self._extract_technical_keywords(cleaned_text)
        
        # Extract general keywords using TF-IDF
        general_keywords = self._extract_general_keywords(cleaned_text)
        
        # Combine and get frequency
        all_keywords = technical_keywords + general_keywords
        keyword_frequency = Counter(all_keywords)
        
        return {
            'technical_keywords': technical_keywords,
            'general_keywords': general_keywords,
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
            top_keywords = [word for word, count in word_counts.most_common(10) if count > 1]
            
            return top_keywords
            
        except Exception as e:
            logger.error(f"Error extracting general keywords: {e}")
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
