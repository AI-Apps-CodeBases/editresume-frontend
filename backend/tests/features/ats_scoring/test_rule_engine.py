from __future__ import annotations

from app.services.ats.keyword_frequency_rules import KeywordFrequencyRule
from app.services.enhanced_ats_service import EnhancedATSChecker


def test_keyword_overuse_penalty_applied():
    rule = KeywordFrequencyRule()
    resume_text = "python " * 12
    extracted_keywords = {"technical_keywords": ["python"]}

    results = rule.evaluate(resume_text=resume_text, extracted_keywords=extracted_keywords)
    assert any(r.rule_name == "keyword_overuse" for r in results)
    total_adj = sum(r.adjustment for r in results)
    assert total_adj < 0


def test_keyword_optimal_frequency_reward_applied():
    rule = KeywordFrequencyRule()
    # 3 keywords, each appears 2x (optimal band includes 2)
    resume_text = "python python react react docker docker"
    extracted_keywords = {"technical_keywords": ["python", "react", "docker"]}

    results = rule.evaluate(resume_text=resume_text, extracted_keywords=extracted_keywords)
    assert any(r.rule_name == "keyword_optimal_frequency" for r in results)
    total_adj = sum(r.adjustment for r in results)
    assert total_adj > 0


def test_enhanced_ats_includes_rule_engine_block():
    checker = EnhancedATSChecker()
    resume_text = "python " * 12
    extracted_keywords = {"technical_keywords": ["python"], "total_keywords": 1}

    resume_data = {
        "name": "Test User",
        "title": "Developer",
        "email": "test@example.com",
        "phone": "123",
        "location": "X",
        "summary": "python developer",
        "sections": [
            {
                "id": "s1",
                "title": "Experience",
                "bullets": [{"id": "b1", "text": resume_text, "params": {}}],
            }
        ],
    }

    result = checker.calculate_industry_standard_score(
        resume_data=resume_data,
        job_description="Looking for a python developer",
        extracted_keywords=extracted_keywords,
        resume_text=resume_text,
    )

    assert "rule_engine" in result
    assert isinstance(result["rule_engine"], dict)
    assert "adjustment" in result["rule_engine"]
    assert "results" in result["rule_engine"]

