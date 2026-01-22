"""ATS Rule Engine service for evaluating rules and calculating score adjustments."""

from __future__ import annotations

import logging
from typing import Any

from app.domain.ats_rules.models import RuleEngineResult
from app.domain.ats_rules.rules import (
    get_content_rules,
    get_formatting_rules,
    get_keyword_rules,
    get_structure_rules,
)
from app.domain.ats_rules.services import RuleEvaluator

logger = logging.getLogger(__name__)


class ATSRuleEngine:
    """Main rule engine that evaluates all ATS rules and calculates score adjustments."""

    def __init__(self):
        """Initialize the rule engine with all rule definitions."""
        self.evaluator = RuleEvaluator()
        self._load_rules()

    def _load_rules(self) -> None:
        """Load all rule definitions."""
        try:
            # Load rules from each category
            keyword_rules = get_keyword_rules()
            structure_rules = get_structure_rules()
            formatting_rules = get_formatting_rules()
            content_rules = get_content_rules()

            # Register all rules
            self.evaluator.register_rules(keyword_rules)
            self.evaluator.register_rules(structure_rules)
            self.evaluator.register_rules(formatting_rules)
            self.evaluator.register_rules(content_rules)

            logger.info(
                f"Loaded {len(keyword_rules)} keyword rules, "
                f"{len(structure_rules)} structure rules, "
                f"{len(formatting_rules)} formatting rules, "
                f"{len(content_rules)} content rules"
            )
        except Exception as e:
            logger.error(f"Error loading rules: {e}", exc_info=True)
            # Continue with empty rules if loading fails

    def evaluate(
        self,
        resume_data: dict[str, Any],
        job_description: str | None = None,
        base_score: float = 0.0,
        extracted_keywords: dict[str, Any] | None = None,
        resume_text: str | None = None,
    ) -> RuleEngineResult:
        """
        Evaluate all rules against resume data and return results.

        Args:
            resume_data: Resume data dictionary
            job_description: Optional job description text
            base_score: Base ATS score (for context)
            extracted_keywords: Optional extracted keywords with importance/frequency
            resume_text: Optional pre-extracted resume text

        Returns:
            RuleEngineResult with all rule evaluations and total adjustment
        """
        try:
            # Build context for rule evaluation
            context: dict[str, Any] = {
                "base_score": base_score,
                "extracted_keywords": extracted_keywords or {},
                "resume_text": resume_text,
                "rule_details": {},
            }

            # Evaluate all rules
            result = self.evaluator.evaluate_all_rules(
                resume_data, job_description, context
            )

            # Ensure total adjustment is within reasonable bounds
            result.total_adjustment = max(-20.0, min(20.0, result.total_adjustment))

            logger.debug(
                f"Rule engine evaluation complete: "
                f"total_adjustment={result.total_adjustment:.2f}, "
                f"rules_passed={result.summary.get('passed_rules', 0)}/{result.summary.get('total_rules', 0)}"
            )

            return result

        except Exception as e:
            logger.error(f"Error evaluating rules: {e}", exc_info=True)
            # Return neutral result on error
            return RuleEngineResult(
                total_adjustment=0.0,
                summary={"error": str(e)},
            )

    def get_rule_count(self) -> dict[str, int]:
        """Get count of rules by category."""
        return {
            "keyword": len(self.evaluator.keyword_rules),
            "structure": len(self.evaluator.structure_rules),
            "formatting": len(self.evaluator.formatting_rules),
            "content": len(self.evaluator.content_rules),
            "total": (
                len(self.evaluator.keyword_rules)
                + len(self.evaluator.structure_rules)
                + len(self.evaluator.formatting_rules)
                + len(self.evaluator.content_rules)
            ),
        }
