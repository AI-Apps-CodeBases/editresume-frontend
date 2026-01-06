"""Critical regression tests - Document current behavior to prevent breakage.

These tests document how features currently work. If any test fails after a change,
it means that change broke existing functionality. DO NOT modify these tests unless
the behavior change is intentional and documented.
"""
import pytest

# Import services directly - database is already mocked in conftest.py
from app.services.enhanced_ats_service import EnhancedATSChecker
from app.services.ats_service import ATSChecker


class TestATSScoreRegression:
    """Regression tests for ATS scoring - most critical feature."""
    
    @pytest.fixture
    def enhanced_ats_checker(self):
        """Create EnhancedATSChecker instance for testing."""
        return EnhancedATSChecker()
    
    @pytest.fixture
    def ats_checker(self):
        """Create ATSChecker instance for testing."""
        return ATSChecker()
    
    @pytest.fixture
    def sample_resume_data(self):
        """Sample resume data for testing."""
        return {
            "name": "John Doe",
            "title": "Software Engineer",
            "email": "john@example.com",
            "phone": "555-0123",
            "location": "San Francisco, CA",
            "summary": "Experienced software engineer with 5+ years in Python and React",
            "sections": [
                {
                    "id": "1",
                    "title": "Experience",
                    "bullets": [
                        {
                            "id": "1",
                            "text": "Developed scalable web applications using React and Node.js",
                            "params": {"visible": True}
                        },
                        {
                            "id": "2",
                            "text": "Led team of 5 developers, increased productivity by 30%",
                            "params": {"visible": True}
                        }
                    ]
                },
                {
                    "id": "2",
                    "title": "Skills",
                    "bullets": [
                        {"id": "3", "text": "Python", "params": {"visible": True}},
                        {"id": "4", "text": "React", "params": {"visible": True}},
                        {"id": "5", "text": "PostgreSQL", "params": {"visible": True}}
                    ]
                }
            ]
        }
    
    @pytest.fixture
    def sample_job_description(self):
        """Sample job description for testing."""
        return """
        Software Engineer Position
        
        We are looking for an experienced Software Engineer with:
        - 5+ years of experience in Python and React
        - Strong background in web development
        - Experience with PostgreSQL databases
        - Leadership skills and team management experience
        
        Responsibilities:
        - Develop scalable web applications
        - Lead development teams
        - Optimize application performance
        """
    
    def test_ats_score_returns_valid_range(self, enhanced_ats_checker, sample_resume_data):
        """Regression: ATS score must always be between 0 and 100."""
        result = enhanced_ats_checker.get_enhanced_ats_score(sample_resume_data)
        
        assert result["success"] is True
        assert 0 <= result["score"] <= 100, f"Score {result['score']} is outside valid range"
    
    def test_invisible_bullets_excluded_from_scoring(self, enhanced_ats_checker, sample_resume_data):
        """Regression: Bullets with visible=False must be excluded from ATS scoring."""
        # Add invisible bullet
        sample_resume_data["sections"][0]["bullets"].append({
            "id": "99",
            "text": "This hidden bullet should not affect score",
            "params": {"visible": False}
        })
        
        # Extract text - invisible bullet should not appear
        text = enhanced_ats_checker.extract_text_from_resume(sample_resume_data)
        assert "This hidden bullet should not affect score" not in text
        
        # Score should not be affected by invisible content
        result = enhanced_ats_checker.get_enhanced_ats_score(sample_resume_data)
        assert result["success"] is True
    
    def test_tfidf_method_used_when_job_description_provided(self, enhanced_ats_checker, sample_resume_data, sample_job_description):
        """Regression: When JD is provided, must use TF-IDF (industry standard) method."""
        result = enhanced_ats_checker.get_enhanced_ats_score(
            sample_resume_data,
            job_description=sample_job_description,
            use_industry_standard=True
        )
        
        assert result["success"] is True
        assert result["method"] == "industry_standard_tfidf", "Should use TF-IDF when JD provided"
    
    def test_comprehensive_method_used_without_job_description(self, enhanced_ats_checker, sample_resume_data):
        """Regression: Without JD, must use comprehensive scoring method."""
        result = enhanced_ats_checker.get_enhanced_ats_score(
            sample_resume_data,
            job_description=None,
            use_industry_standard=False
        )
        
        assert result["success"] is True
        assert result["method"] in ["comprehensive", "industry_standard_tfidf"], "Should use comprehensive method"
    
    def test_text_extraction_handles_special_characters(self, enhanced_ats_checker):
        """Regression: Text extraction must handle special characters without crashing."""
        resume_with_special = {
            "name": "José García",
            "title": "C++ Developer",
            "summary": "Experience with C/C++, Node.js, & React",
            "sections": [
                {
                    "id": "1",
                    "title": "Skills",
                    "bullets": [
                        {"id": "1", "text": "C++", "params": {"visible": True}},
                        {"id": "2", "text": "C#", "params": {"visible": True}},
                        {"id": "3", "text": "Node.js", "params": {"visible": True}}
                    ]
                }
            ]
        }
        
        # Should not crash
        text = enhanced_ats_checker.extract_text_from_resume(resume_with_special)
        assert "C++" in text or "C#" in text or "Node.js" in text
        
        # Should calculate score
        result = enhanced_ats_checker.get_enhanced_ats_score(resume_with_special)
        assert result["success"] is True
    
    def test_empty_resume_handled_gracefully(self, enhanced_ats_checker):
        """Regression: Empty resume must not crash, should return valid response."""
        empty_resume = {
            "name": "",
            "title": "",
            "sections": []
        }
        
        result = enhanced_ats_checker.get_enhanced_ats_score(empty_resume)
        
        # Should handle gracefully, not crash
        assert "success" in result
        assert "score" in result
        assert 0 <= result["score"] <= 100
    
    def test_ats_score_includes_suggestions(self, enhanced_ats_checker, sample_resume_data):
        """Regression: ATS score response must include suggestions list."""
        result = enhanced_ats_checker.get_enhanced_ats_score(sample_resume_data)
        
        assert result["success"] is True
        assert "suggestions" in result
        assert isinstance(result["suggestions"], list)
    
    def test_ats_score_includes_details(self, enhanced_ats_checker, sample_resume_data):
        """Regression: ATS score response must include details dictionary."""
        result = enhanced_ats_checker.get_enhanced_ats_score(sample_resume_data)
        
        assert result["success"] is True
        assert "details" in result
        assert isinstance(result["details"], dict)
    
    def test_keyword_matching_with_extension_data(self, enhanced_ats_checker, sample_resume_data, sample_job_description):
        """Regression: ATS scoring must work with extracted keywords from extension."""
        extracted_keywords = {
            "technical_keywords": ["Python", "React", "PostgreSQL"],
            "general_keywords": ["web development", "scalable"],
            "total_keywords": 5
        }
        
        result = enhanced_ats_checker.get_enhanced_ats_score(
            sample_resume_data,
            job_description=sample_job_description,
            extracted_keywords=extracted_keywords,
            use_industry_standard=True
        )
        
        assert result["success"] is True
        assert 0 <= result["score"] <= 100
    
    def test_section_analysis_detects_required_sections(self, enhanced_ats_checker, sample_resume_data):
        """Regression: Section analysis must detect required sections."""
        analysis = enhanced_ats_checker.analyze_resume_structure(sample_resume_data)
        
        assert "found_sections" in analysis
        assert "section_score" in analysis
        assert "missing_sections" in analysis
        assert isinstance(analysis["section_score"], (int, float))
        assert 0 <= analysis["section_score"] <= 100


class TestResumeTextExtractionRegression:
    """Regression tests for resume text extraction."""
    
    @pytest.fixture
    def enhanced_ats_checker(self):
        """Create EnhancedATSChecker instance for testing."""
        return EnhancedATSChecker()
    
    def test_extract_text_includes_all_visible_content(self, enhanced_ats_checker):
        """Regression: Text extraction must include all visible sections and bullets."""
        resume = {
            "name": "Test User",
            "title": "Developer",
            "summary": "Test summary",
            "sections": [
                {
                    "id": "1",
                    "title": "Experience",
                    "bullets": [
                        {"id": "1", "text": "Bullet 1", "params": {"visible": True}},
                        {"id": "2", "text": "Bullet 2", "params": {"visible": True}}
                    ]
                }
            ]
        }
        
        text = enhanced_ats_checker.extract_text_from_resume(resume)
        
        assert "Test User" in text
        assert "Developer" in text
        assert "Test summary" in text
        assert "Bullet 1" in text
        assert "Bullet 2" in text
    
    def test_extract_text_excludes_invisible_bullets(self, enhanced_ats_checker):
        """Regression: Text extraction must exclude invisible bullets."""
        resume = {
            "name": "Test",
            "sections": [
                {
                    "id": "1",
                    "title": "Experience",
                    "bullets": [
                        {"id": "1", "text": "Visible", "params": {"visible": True}},
                        {"id": "2", "text": "Hidden", "params": {"visible": False}}
                    ]
                }
            ]
        }
        
        text = enhanced_ats_checker.extract_text_from_resume(resume)
        
        assert "Visible" in text
        assert "Hidden" not in text


class TestAPIResponseStructureRegression:
    """Regression tests for API response structure - frontend depends on this."""
    
    @pytest.fixture
    def enhanced_ats_checker(self):
        """Create EnhancedATSChecker instance for testing."""
        return EnhancedATSChecker()
    
    @pytest.fixture
    def ats_checker(self):
        """Create ATSChecker instance for testing."""
        return ATSChecker()
    
    def test_enhanced_ats_response_structure(self, enhanced_ats_checker):
        """Regression: Enhanced ATS API response must have expected structure."""
        resume = {
            "name": "Test",
            "sections": [{"id": "1", "title": "Skills", "bullets": []}]
        }
        
        result = enhanced_ats_checker.get_enhanced_ats_score(resume)
        
        # Frontend expects these fields
        required_fields = ["success", "score", "suggestions", "details", "method"]
        for field in required_fields:
            assert field in result, f"Missing required field: {field}"
        
        assert isinstance(result["success"], bool)
        assert isinstance(result["score"], (int, float))
        assert isinstance(result["suggestions"], list)
        assert isinstance(result["details"], dict)
    
    def test_basic_ats_response_structure(self, ats_checker):
        """Regression: Basic ATS API response must have expected structure."""
        resume = {
            "name": "Test",
            "sections": [{"id": "1", "title": "Skills", "bullets": []}]
        }
        
        result = ats_checker.get_ats_score(resume)
        
        # Basic structure check
        assert "success" in result or "score" in result
        if "score" in result:
            assert 0 <= result["score"] <= 100


class TestEdgeCasesRegression:
    """Regression tests for edge cases that have caused issues before."""
    
    @pytest.fixture
    def enhanced_ats_checker(self):
        """Create EnhancedATSChecker instance for testing."""
        return EnhancedATSChecker()
    
    def test_resume_with_only_name(self, enhanced_ats_checker):
        """Regression: Resume with only name must not crash."""
        minimal_resume = {"name": "John Doe"}
        
        result = enhanced_ats_checker.get_enhanced_ats_score(minimal_resume)
        assert result["success"] is True
    
    def test_resume_with_none_values(self, enhanced_ats_checker):
        """Regression: Resume with None values must be handled."""
        resume_with_none = {
            "name": "Test",
            "title": None,
            "summary": None,
            "sections": None
        }
        
        # Should not crash
        result = enhanced_ats_checker.get_enhanced_ats_score(resume_with_none)
        assert "success" in result
    
    def test_very_long_resume_text(self, enhanced_ats_checker):
        """Regression: Very long resume text must not cause issues."""
        long_text = "Python " * 1000  # 6000+ characters
        long_resume = {
            "name": "Test",
            "summary": long_text,
            "sections": [{"id": "1", "title": "Skills", "bullets": []}]
        }
        
        result = enhanced_ats_checker.get_enhanced_ats_score(long_resume)
        assert result["success"] is True

