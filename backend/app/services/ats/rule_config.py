"""ATS rule engine configuration.

Centralizes rule thresholds and caps so they can be tuned without changing rule logic.
"""

from __future__ import annotations

from dataclasses import dataclass


KeywordType = str  # 'common' | 'technical' | 'priority' | 'skill'


@dataclass(frozen=True)
class KeywordFrequencyThresholds:
    """Max allowed occurrences in resume text before applying overuse penalties."""

    common: int = 9
    technical: int = 10
    priority: int = 8
    skill: int = 7

    def for_type(self, keyword_type: KeywordType) -> int:
        if keyword_type == "technical":
            return self.technical
        if keyword_type == "priority":
            return self.priority
        if keyword_type == "skill":
            return self.skill
        return self.common


@dataclass(frozen=True)
class RuleAdjustmentCaps:
    """Caps to keep rule-based adjustments stable and predictable."""

    # Cap total rule adjustments so rules can't swing scores too much.
    total_abs_cap: float = 10.0
    # Cap a single rule instance.
    per_rule_abs_cap: float = 5.0


DEFAULT_KEYWORD_FREQUENCY_THRESHOLDS = KeywordFrequencyThresholds()
DEFAULT_RULE_ADJUSTMENT_CAPS = RuleAdjustmentCaps()

