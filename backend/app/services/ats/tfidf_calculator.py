"""TF-IDF cosine similarity calculator - extracted from EnhancedATSChecker.

This module calculates TF-IDF + Cosine Similarity scores for ATS matching.
Uses sklearn's TfidfVectorizer and cosine_similarity for industry-standard scoring.
"""
from __future__ import annotations

import logging
import re
from typing import Any, TYPE_CHECKING, Union

logger = logging.getLogger(__name__)

# Try to import sklearn
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    TfidfVectorizer = None  # type: ignore

if TYPE_CHECKING:
    from sklearn.feature_extraction.text import TfidfVectorizer as _TfidfVectorizerType
    _VectorizerType = _TfidfVectorizerType
else:
    _VectorizerType = Any


def _fallback_keyword_match(resume_text: str, job_description: str) -> dict[str, Any]:
    """Fallback keyword matching when TF-IDF is not available."""
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


def calculate_tfidf_cosine_score(
    resume_text: str,
    vectorizer: Union["_VectorizerType", None],
    job_description: str = None,
    extracted_keywords: dict = None,
    resume_data: dict = None
) -> dict[str, Any]:
    """
    Industry-standard TF-IDF + Cosine Similarity scoring method.
    Based on information retrieval best practices used by most ATS systems.
    
    Formula: Cosine Similarity = (A · B) / (||A|| × ||B||)
    Where A and B are TF-IDF vectors of resume and job description.
    
    If extracted_keywords is provided (from extension), uses those keywords instead of
    extracting new ones from job_description. This ensures consistency and accuracy.
    
    Args:
        resume_text: Text content from resume
        vectorizer: Pre-configured TfidfVectorizer instance
        job_description: Job description text (optional if extracted_keywords provided)
        extracted_keywords: Keywords extracted by extension (optional)
        resume_data: Resume data dict (for summary matching)
        
    Returns:
        Dict with score, method, matching_keywords, missing_keywords, etc.
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
        return _fallback_keyword_match(resume_text, job_description or "")

    try:
        # Reuse the vectorizer from EnhancedATSChecker for efficiency
        if not vectorizer:
            # Fallback if vectorizer wasn't initialized
            return _fallback_keyword_match(resume_text, job_description or "")

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
        tfidf_matrix = vectorizer.fit_transform([resume_text, keyword_text])

        # Calculate cosine similarity (industry-standard method)
        cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]

        # Convert to percentage score (0-100) with stabilized scaling
        cosine_score = cosine_sim * 100
        # Small base boost for better scaling (5% boost) with smoothing
        if cosine_score > 0:
            cosine_score = min(100, cosine_score * 1.05)

        # Extract feature names (keywords) and their TF-IDF scores
        feature_names = vectorizer.get_feature_names_out()
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
                    if re.search(pattern, resume_text_lower) or kw_str in resume_text_lower:
                        direct_matching_keywords.add(kw_str)

            # Check high frequency keywords
            high_freq = extracted_keywords.get("high_frequency_keywords", [])
            for kw_item in high_freq:
                kw = kw_item.get("keyword", kw_item) if isinstance(kw_item, dict) else kw_item
                if kw:
                    kw_str = str(kw).lower().strip()
                    # More lenient matching for high frequency keywords
                    pattern = r'\b' + re.escape(kw_str) + r'\b'
                    if re.search(pattern, resume_text_lower) or kw_str in resume_text_lower:
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

        # Count summary keyword matches and limit to 8 to prevent excessive score inflation
        summary_match_count = 0
        if resume_data:
            summary = resume_data.get("summary", "")
            if summary and summary.strip() and use_extracted_keywords and extracted_keywords:
                summary_lower = summary.lower()
                # Count unique keywords found in summary
                all_keywords = []
                for keyword_list in [
                    extracted_keywords.get("technical_keywords", []),
                    extracted_keywords.get("general_keywords", []),
                    extracted_keywords.get("soft_skills", []),
                    extracted_keywords.get("priority_keywords", []),
                ]:
                    all_keywords.extend([str(kw).lower().strip() for kw in keyword_list if kw])

                high_freq = extracted_keywords.get("high_frequency_keywords", [])
                for kw_item in high_freq:
                    kw = kw_item.get("keyword", kw_item) if isinstance(kw_item, dict) else kw_item
                    if kw:
                        all_keywords.append(str(kw).lower().strip())

                # Count matches in summary (limit to 8)
                summary_matches = set()
                for kw_str in all_keywords:
                    if len(summary_matches) >= 8:
                        break  # Stop at 8
                    pattern = r'\b' + re.escape(kw_str) + r'\b'
                    if re.search(pattern, summary_lower) or kw_str in summary_lower:
                        summary_matches.add(kw_str)
                summary_match_count = len(summary_matches)

        # Adjust matching_count: subtract excess summary matches (if > 8)
        total_matching_count = len(matching_keywords)
        if summary_match_count > 8:
            excess_summary_matches = summary_match_count - 8
            # Reduce matching_count by excess (but don't go below 0)
            matching_count = max(0, total_matching_count - excess_summary_matches)
            logger.debug(f"Summary keyword limit: {summary_match_count} matches found in summary, limiting to 8. Adjusted matching_count: {matching_count} (was {total_matching_count})")
        else:
            matching_count = total_matching_count

        # Increased boost for matching keywords to reward keyword additions
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
        logger.error(f"Error in TF-IDF calculation: {e}", exc_info=True)
        # Fallback to simple matching on error
        return _fallback_keyword_match(resume_text, job_description or "")

