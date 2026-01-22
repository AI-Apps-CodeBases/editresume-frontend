"""Tests for ATSRuleEngine service."""

from __future__ import annotations

import pytest

from app.services.ats_rule_engine import ATSRuleEngine


@pytest.fixture
def sample_resume_data():
    """Sample resume data for testing."""
    return {
        "name": "John Doe",
        "title": "Software Engineer",
        "email": "john@example.com",
        "phone": "123-456-7890",
        "summary": "Experienced software engineer with expertise in Python, React, and AWS",
        "sections": [
            {
                "title": "Work Experience",
                "bullets": [
                    {"text": "Led development of web applications using React and Python", "params": {"visible": True}},
                    {"text": "Improved performance by 30% through optimization", "params": {"visible": True}},
                    {"text": "Managed team of 5 developers", "params": {"visible": True}},
                ],
            },
            {
                "title": "Education",
                "bullets": [
                    {"text": "BS in Computer Science from University", "params": {"visible": True}},
                ],
            },
            {
                "title": "Skills",
                "bullets": [
                    {"text": "Python, React, AWS, Docker", "params": {"visible": True}},
                ],
            },
        ],
    }


@pytest.fixture
def sample_job_description():
    """Sample job description for testing."""
    return """
    We are looking for a Software Engineer with experience in:
    - Python programming
    - React framework
    - AWS cloud services
    - Docker containerization
    
    The ideal candidate should have strong problem-solving skills and
    experience leading development teams.
    """


@pytest.fixture
def rule_engine():
    """Create an ATSRuleEngine instance."""
    return ATSRuleEngine()


def test_rule_engine_initialization(rule_engine):
    """Test that rule engine initializes and loads rules."""
    rule_count = rule_engine.get_rule_count()
    
    assert rule_count["total"] > 0
    assert rule_count["keyword"] > 0
    assert rule_count["structure"] > 0
    assert rule_count["formatting"] > 0
    assert rule_count["content"] > 0


def test_evaluate_with_resume_data(rule_engine, sample_resume_data):
    """Test evaluating rules with resume data."""
    result = rule_engine.evaluate(
        resume_data=sample_resume_data,
        job_description=None,
        base_score=70.0,
    )
    
    assert result is not None
    assert isinstance(result.total_adjustment, float)
    assert -20.0 <= result.total_adjustment <= 20.0  # Within bounds
    assert len(result.all_rules) > 0


def test_evaluate_with_job_description(rule_engine, sample_resume_data, sample_job_description):
    """Test evaluating rules with job description."""
    result = rule_engine.evaluate(
        resume_data=sample_resume_data,
        job_description=sample_job_description,
        base_score=70.0,
    )
    
    assert result is not None
    assert len(result.keyword_rules) > 0


def test_evaluate_with_extracted_keywords(rule_engine, sample_resume_data):
    """Test evaluating rules with extracted keywords."""
    extracted_keywords = {
        "technical_keywords": ["python", "react", "aws"],
        "high_frequency_keywords": [
            {"keyword": "python", "importance": "high", "frequency": 5},
            {"keyword": "react", "importance": "high", "frequency": 4},
        ],
    }
    
    result = rule_engine.evaluate(
        resume_data=sample_resume_data,
        job_description=None,
        base_score=70.0,
        extracted_keywords=extracted_keywords,
    )
    
    assert result is not None
    # Should have evaluated keyword rules
    assert len(result.keyword_rules) > 0


def test_evaluate_adjustment_bounds(rule_engine, sample_resume_data):
    """Test that adjustments are within reasonable bounds."""
    result = rule_engine.evaluate(
        resume_data=sample_resume_data,
        job_description=None,
        base_score=70.0,
    )
    
    # Total adjustment should be capped at ±20
    assert -20.0 <= result.total_adjustment <= 20.0


def test_evaluate_error_handling(rule_engine):
    """Test that rule engine handles errors gracefully."""
    # Invalid resume data
    invalid_resume = None
    
    result = rule_engine.evaluate(
        resume_data=invalid_resume,  # type: ignore
        job_description=None,
        base_score=70.0,
    )
    
    # Should return neutral result on error
    assert result is not None
    assert result.total_adjustment == 0.0


def test_evaluate_summary_statistics(rule_engine, sample_resume_data):
    """Test that summary statistics are generated."""
    result = rule_engine.evaluate(
        resume_data=sample_resume_data,
        job_description=None,
        base_score=70.0,
    )
    
    assert "summary" in result.model_dump() or "summary" in result.dict()
    summary = result.summary
    
    assert "total_rules" in summary
    assert "passed_rules" in summary
    assert "failed_rules" in summary
    assert summary["total_rules"] > 0
