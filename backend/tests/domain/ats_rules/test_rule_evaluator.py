"""Tests for RuleEvaluator service."""

from __future__ import annotations

import pytest

from app.domain.ats_rules.models import ATSRule, ImpactType, RuleType
from app.domain.ats_rules.services import RuleEvaluator


@pytest.fixture
def sample_resume_data():
    """Sample resume data for testing."""
    return {
        "name": "John Doe",
        "title": "Software Engineer",
        "email": "john@example.com",
        "phone": "123-456-7890",
        "summary": "Experienced software engineer with expertise in Python and React",
        "sections": [
            {
                "title": "Work Experience",
                "bullets": [
                    {"text": "Led development of web applications using React", "params": {"visible": True}},
                    {"text": "Improved performance by 30%", "params": {"visible": True}},
                ],
            },
            {
                "title": "Education",
                "bullets": [
                    {"text": "BS in Computer Science", "params": {"visible": True}},
                ],
            },
        ],
    }


@pytest.fixture
def rule_evaluator():
    """Create a RuleEvaluator instance."""
    return RuleEvaluator()


def test_register_rule(rule_evaluator):
    """Test registering a single rule."""
    rule = ATSRule(
        id="test_rule",
        name="Test Rule",
        category=RuleType.KEYWORD,
        condition=lambda resume, job_desc, context: True,
        impact=ImpactType.BONUS,
        base_value=5.0,
    )
    
    rule_evaluator.register_rule(rule)
    
    assert len(rule_evaluator.keyword_rules) == 1
    assert rule_evaluator.keyword_rules[0].id == "test_rule"


def test_register_rules(rule_evaluator):
    """Test registering multiple rules."""
    rules = [
        ATSRule(
            id=f"rule_{i}",
            name=f"Rule {i}",
            category=RuleType.KEYWORD,
            condition=lambda resume, job_desc, context: True,
            impact=ImpactType.BONUS,
            base_value=1.0,
        )
        for i in range(3)
    ]
    
    rule_evaluator.register_rules(rules)
    
    assert len(rule_evaluator.keyword_rules) == 3


def test_evaluate_rule_passed(rule_evaluator, sample_resume_data):
    """Test evaluating a rule that passes."""
    rule = ATSRule(
        id="test_rule",
        name="Test Rule",
        category=RuleType.KEYWORD,
        condition=lambda resume, job_desc, context: True,
        impact=ImpactType.BONUS,
        base_value=5.0,
    )
    
    result = rule_evaluator.evaluate_rule(rule, sample_resume_data, None, {})
    
    assert result.passed is True
    assert result.impact_value == 5.0
    assert result.rule_id == "test_rule"


def test_evaluate_rule_failed(rule_evaluator, sample_resume_data):
    """Test evaluating a rule that fails."""
    rule = ATSRule(
        id="test_rule",
        name="Test Rule",
        category=RuleType.KEYWORD,
        condition=lambda resume, job_desc, context: False,
        impact=ImpactType.BONUS,
        base_value=5.0,
    )
    
    result = rule_evaluator.evaluate_rule(rule, sample_resume_data, None, {})
    
    assert result.passed is False
    assert result.impact_value == 0.0


def test_evaluate_rule_penalty(rule_evaluator, sample_resume_data):
    """Test evaluating a penalty rule."""
    rule = ATSRule(
        id="test_penalty",
        name="Test Penalty",
        category=RuleType.STRUCTURE,
        condition=lambda resume, job_desc, context: True,  # Rule passes (applies penalty)
        impact=ImpactType.PENALTY,
        base_value=3.0,
    )
    
    result = rule_evaluator.evaluate_rule(rule, sample_resume_data, None, {})
    
    assert result.passed is True
    assert result.impact_value == -3.0  # Penalty is negative


def test_evaluate_rule_max_impact(rule_evaluator, sample_resume_data):
    """Test that max_impact constraint is applied."""
    rule = ATSRule(
        id="test_max",
        name="Test Max",
        category=RuleType.KEYWORD,
        condition=lambda resume, job_desc, context: True,
        impact=ImpactType.BONUS,
        base_value=10.0,
        max_impact=5.0,
    )
    
    result = rule_evaluator.evaluate_rule(rule, sample_resume_data, None, {})
    
    assert result.impact_value == 5.0  # Capped at max_impact


def test_evaluate_all_rules(rule_evaluator, sample_resume_data):
    """Test evaluating all rule categories."""
    # Add rules to each category
    keyword_rule = ATSRule(
        id="kw_rule",
        name="Keyword Rule",
        category=RuleType.KEYWORD,
        condition=lambda resume, job_desc, context: True,
        impact=ImpactType.BONUS,
        base_value=2.0,
    )
    
    structure_rule = ATSRule(
        id="struct_rule",
        name="Structure Rule",
        category=RuleType.STRUCTURE,
        condition=lambda resume, job_desc, context: True,
        impact=ImpactType.BONUS,
        base_value=1.0,
    )
    
    rule_evaluator.register_rule(keyword_rule)
    rule_evaluator.register_rule(structure_rule)
    
    result = rule_evaluator.evaluate_all_rules(sample_resume_data, None, {})
    
    assert len(result.keyword_rules) == 1
    assert len(result.structure_rules) == 1
    assert len(result.all_rules) == 2
    assert result.total_adjustment == 3.0  # 2.0 + 1.0


def test_evaluate_rule_exception_handling(rule_evaluator, sample_resume_data):
    """Test that rule evaluation handles exceptions gracefully."""
    rule = ATSRule(
        id="error_rule",
        name="Error Rule",
        category=RuleType.KEYWORD,
        condition=lambda resume, job_desc, context: (_ for _ in ()).throw(Exception("Test error")),
        impact=ImpactType.BONUS,
        base_value=5.0,
    )
    
    result = rule_evaluator.evaluate_rule(rule, sample_resume_data, None, {})
    
    # Should return neutral result on error
    assert result.passed is False
    assert result.impact_value == 0.0
    assert "error" in result.message.lower()
