"""ATS rule engine.

This provides a thin, testable layer for applying deterministic rules on top of
the statistical scoring (TF-IDF / similarity). Rules return structured results
that can be surfaced to the frontend.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class RuleResult:
    rule_name: str
    rule_type: str  # 'penalty' | 'reward' | 'info'
    adjustment: float
    reason: str
    affected_keywords: list[str] | None = None
    meta: dict[str, Any] | None = None


class RuleEngine:
    """Coordinates rule evaluations and returns a combined adjustment."""

    def __init__(self):
        self._rules: list[Any] = []

    def register_rule(self, rule: Any) -> None:
        """Register a rule evaluator with an `evaluate(...) -> list[RuleResult]` method."""
        self._rules.append(rule)

    def evaluate(self, **context: Any) -> list[RuleResult]:
        results: list[RuleResult] = []
        for rule in self._rules:
            try:
                rule_results = rule.evaluate(**context)
                if rule_results:
                    results.extend(rule_results)
            except Exception:
                # Rules should never crash scoring; ignore and continue.
                continue
        return results

    @staticmethod
    def sum_adjustments(results: list[RuleResult]) -> float:
        return float(sum(r.adjustment for r in results))

