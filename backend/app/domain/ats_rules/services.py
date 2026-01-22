"""Rule evaluation service for ATS scoring."""

from __future__ import annotations

from typing import Any

from app.domain.ats_rules.models import (
    ATSRule,
    ImpactType,
    RuleEvaluationResult,
    RuleEngineResult,
    RuleType,
)


class RuleEvaluator:
    """Evaluates ATS rules against resume data."""

    def __init__(self):
        """Initialize the rule evaluator."""
        self.keyword_rules: list[ATSRule] = []
        self.structure_rules: list[ATSRule] = []
        self.formatting_rules: list[ATSRule] = []
        self.content_rules: list[ATSRule] = []

    def register_rule(self, rule: ATSRule) -> None:
        """Register a rule for evaluation."""
        if rule.category == RuleType.KEYWORD:
            self.keyword_rules.append(rule)
        elif rule.category == RuleType.STRUCTURE:
            self.structure_rules.append(rule)
        elif rule.category == RuleType.FORMATTING:
            self.formatting_rules.append(rule)
        elif rule.category == RuleType.CONTENT:
            self.content_rules.append(rule)

    def register_rules(self, rules: list[ATSRule]) -> None:
        """Register multiple rules."""
        for rule in rules:
            self.register_rule(rule)

    def evaluate_rule(
        self,
        rule: ATSRule,
        resume_data: dict[str, Any],
        job_description: str | None,
        context: dict[str, Any],
    ) -> RuleEvaluationResult:
        """Evaluate a single rule."""
        try:
            passed = rule.condition(resume_data, job_description, context)
            impact_value = 0.0

            if passed:
                if rule.impact == ImpactType.BONUS:
                    impact_value = rule.base_value
                elif rule.impact == ImpactType.PENALTY:
                    impact_value = -abs(rule.base_value)
                elif rule.impact == ImpactType.MULTIPLIER:
                    # Multiplier rules need base score from context
                    base_score = context.get("base_score", 0)
                    impact_value = (rule.base_value - 1.0) * base_score
            else:
                # Rule failed - apply opposite impact
                if rule.impact == ImpactType.BONUS:
                    impact_value = 0.0  # No bonus if rule fails
                elif rule.impact == ImpactType.PENALTY:
                    impact_value = 0.0  # No penalty if rule fails (already penalized by not getting bonus)
                elif rule.impact == ImpactType.MULTIPLIER:
                    impact_value = 0.0

            # Apply min/max constraints
            if rule.max_impact is not None:
                impact_value = min(impact_value, rule.max_impact)
            if rule.min_impact is not None:
                impact_value = max(impact_value, rule.min_impact)

            return RuleEvaluationResult(
                rule_id=rule.id,
                rule_name=rule.name,
                category=rule.category,
                passed=passed,
                impact_value=impact_value,
                max_impact=rule.max_impact,
                min_impact=rule.min_impact,
                message=self._generate_message(rule, passed, impact_value),
                suggestion=rule.suggestion if not passed else "",
                details=context.get("rule_details", {}).get(rule.id, {}),
            )
        except Exception as e:
            # If rule evaluation fails, return neutral result
            return RuleEvaluationResult(
                rule_id=rule.id,
                rule_name=rule.name,
                category=rule.category,
                passed=False,
                impact_value=0.0,
                message=f"Rule evaluation error: {str(e)}",
                suggestion="",
            )

    def evaluate_keyword_rules(
        self,
        resume_data: dict[str, Any],
        job_description: str | None,
        context: dict[str, Any],
    ) -> list[RuleEvaluationResult]:
        """Evaluate all keyword-related rules."""
        results = []
        for rule in self.keyword_rules:
            result = self.evaluate_rule(rule, resume_data, job_description, context)
            results.append(result)
        return results

    def evaluate_structure_rules(
        self,
        resume_data: dict[str, Any],
        job_description: str | None,
        context: dict[str, Any],
    ) -> list[RuleEvaluationResult]:
        """Evaluate all structure-related rules."""
        results = []
        for rule in self.structure_rules:
            result = self.evaluate_rule(rule, resume_data, job_description, context)
            results.append(result)
        return results

    def evaluate_formatting_rules(
        self,
        resume_data: dict[str, Any],
        job_description: str | None,
        context: dict[str, Any],
    ) -> list[RuleEvaluationResult]:
        """Evaluate all formatting-related rules."""
        results = []
        for rule in self.formatting_rules:
            result = self.evaluate_rule(rule, resume_data, job_description, context)
            results.append(result)
        return results

    def evaluate_content_rules(
        self,
        resume_data: dict[str, Any],
        job_description: str | None,
        context: dict[str, Any],
    ) -> list[RuleEvaluationResult]:
        """Evaluate all content quality rules."""
        results = []
        for rule in self.content_rules:
            result = self.evaluate_rule(rule, resume_data, job_description, context)
            results.append(result)
        return results

    def evaluate_all_rules(
        self,
        resume_data: dict[str, Any],
        job_description: str | None,
        context: dict[str, Any],
    ) -> RuleEngineResult:
        """Evaluate all rules and return aggregated results."""
        keyword_results = self.evaluate_keyword_rules(
            resume_data, job_description, context
        )
        structure_results = self.evaluate_structure_rules(
            resume_data, job_description, context
        )
        formatting_results = self.evaluate_formatting_rules(
            resume_data, job_description, context
        )
        content_results = self.evaluate_content_rules(
            resume_data, job_description, context
        )

        all_results = (
            keyword_results + structure_results + formatting_results + content_results
        )

        # Calculate total adjustment
        total_adjustment = sum(result.impact_value for result in all_results)

        # Generate summary
        summary = {
            "total_rules": len(all_results),
            "passed_rules": sum(1 for r in all_results if r.passed),
            "failed_rules": sum(1 for r in all_results if not r.passed),
            "keyword_rules_count": len(keyword_results),
            "structure_rules_count": len(structure_results),
            "formatting_rules_count": len(formatting_results),
            "content_rules_count": len(content_results),
            "total_bonus": sum(
                r.impact_value for r in all_results if r.impact_value > 0
            ),
            "total_penalty": sum(
                r.impact_value for r in all_results if r.impact_value < 0
            ),
        }

        return RuleEngineResult(
            total_adjustment=total_adjustment,
            keyword_rules=keyword_results,
            structure_rules=structure_results,
            formatting_rules=formatting_results,
            content_rules=content_results,
            all_rules=all_results,
            summary=summary,
        )

    def _generate_message(
        self, rule: ATSRule, passed: bool, impact_value: float
    ) -> str:
        """Generate a human-readable message for the rule result."""
        if passed:
            if impact_value > 0:
                return f"{rule.name}: Passed (+{impact_value:.1f} points)"
            elif impact_value < 0:
                return f"{rule.name}: Passed ({impact_value:.1f} points)"
            else:
                return f"{rule.name}: Passed"
        else:
            return f"{rule.name}: Failed"
