"""Keyword frequency rules for ATS scoring.

Detects keyword overuse (potential keyword stuffing) and rewards keywords used in
an "optimal" band.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from app.services.ats.rule_config import (
    DEFAULT_KEYWORD_FREQUENCY_THRESHOLDS,
    DEFAULT_RULE_ADJUSTMENT_CAPS,
    KeywordFrequencyThresholds,
    RuleAdjustmentCaps,
)
from app.services.ats.rule_engine import RuleResult


KeywordType = str  # 'common' | 'technical' | 'priority' | 'skill'


def _escape_regex(s: str) -> str:
    return re.escape(s)


def _count_keyword_occurrences(text_lower: str, keyword: str) -> int:
    """Count occurrences of keyword in normalized lower-case text."""
    kw = (keyword or "").strip().lower()
    if not kw or len(kw) < 2:
        return 0

    has_special = bool(re.search(r"[\/\-_+#.]", kw))
    escaped = _escape_regex(kw)
    pattern = escaped if has_special else rf"\b{escaped}\b"
    return len(re.findall(pattern, text_lower, flags=re.IGNORECASE))


def _keyword_type_from_extracted(extracted_keywords: dict | None) -> dict[str, KeywordType]:
    """Build keyword -> type mapping using extension keyword buckets when available."""
    if not extracted_keywords:
        return {}

    mapping: dict[str, KeywordType] = {}

    def add_all(values: list[Any] | None, typ: KeywordType) -> None:
        if not values:
            return
        for v in values:
            if not v:
                continue
            mapping[str(v).strip().lower()] = typ

    add_all(extracted_keywords.get("priority_keywords"), "priority")
    add_all(extracted_keywords.get("technical_keywords"), "technical")
    add_all(extracted_keywords.get("general_keywords"), "common")
    add_all(extracted_keywords.get("soft_skills"), "skill")

    high_freq = extracted_keywords.get("high_frequency_keywords") or []
    for item in high_freq:
        if isinstance(item, dict):
            kw = item.get("keyword")
        else:
            kw = item
        if kw:
            # High frequency terms are usually "common" unless already classified.
            mapping.setdefault(str(kw).strip().lower(), "common")

    return mapping


@dataclass(frozen=True)
class KeywordFrequencyRule:
    thresholds: KeywordFrequencyThresholds = DEFAULT_KEYWORD_FREQUENCY_THRESHOLDS
    caps: RuleAdjustmentCaps = DEFAULT_RULE_ADJUSTMENT_CAPS

    # "Optimal" usage band (inclusive lower, inclusive upper)
    optimal_min: int = 2
    optimal_max: int = 8

    def evaluate(
        self,
        *,
        resume_text: str,
        extracted_keywords: dict | None = None,
        keyword_counts: dict[str, int] | None = None,
        keyword_types: dict[str, KeywordType] | None = None,
        **_: Any,
    ) -> list[RuleResult]:
        """Return RuleResults for keyword frequency penalties/rewards."""
        text_lower = (resume_text or "").lower()
        if not text_lower.strip():
            return []

        types = (keyword_types or {}).copy()
        types_from_extracted = _keyword_type_from_extracted(extracted_keywords)
        for k, t in types_from_extracted.items():
            types.setdefault(k, t)

        # If caller didn't pass counts, compute counts for any known keywords.
        counts: dict[str, int] = {}
        if keyword_counts:
            for k, v in keyword_counts.items():
                counts[str(k).strip().lower()] = int(v)
        else:
            for kw_norm in types.keys():
                counts[kw_norm] = _count_keyword_occurrences(text_lower, kw_norm)

        results: list[RuleResult] = []

        # Penalties for overuse
        overused: list[str] = []
        total_penalty = 0.0
        for kw_norm, count in counts.items():
            if count <= 0:
                continue
            kw_type = types.get(kw_norm, "common")
            threshold = self.thresholds.for_type(kw_type)
            if count > threshold:
                over_by = count - threshold
                # Penalty grows with overuse but is capped.
                # Example: 1 over -> -0.6, 2 over -> -1.2 ... capped at -5 per keyword.
                penalty = -min(self.caps.per_rule_abs_cap, over_by * 0.6)
                total_penalty += penalty
                overused.append(kw_norm)
                results.append(
                    RuleResult(
                        rule_name="keyword_overuse",
                        rule_type="penalty",
                        adjustment=penalty,
                        reason=(
                            f'Keyword "{kw_norm}" appears {count} times '
                            f"(threshold: {threshold} for {kw_type})."
                        ),
                        affected_keywords=[kw_norm],
                        meta={"count": count, "threshold": threshold, "keyword_type": kw_type},
                    )
                )

        # Rewards for good distribution (only if no heavy stuffing)
        # If penalties are large, don't also reward heavily.
        reward_budget = max(0.0, 6.0 + total_penalty)  # total_penalty is negative
        if reward_budget > 0:
            rewarded: list[str] = []
            reward_total = 0.0
            for kw_norm, count in counts.items():
                if count < self.optimal_min or count > self.optimal_max:
                    continue
                # Small reward per keyword in band, capped by remaining budget.
                reward = min(0.25, reward_budget - reward_total)
                if reward <= 0:
                    break
                reward_total += reward
                rewarded.append(kw_norm)

            if reward_total > 0:
                results.append(
                    RuleResult(
                        rule_name="keyword_optimal_frequency",
                        rule_type="reward",
                        adjustment=min(self.caps.per_rule_abs_cap, reward_total),
                        reason=f"{len(rewarded)} keywords are used in the optimal frequency range.",
                        affected_keywords=rewarded[:25],
                        meta={
                            "optimal_min": self.optimal_min,
                            "optimal_max": self.optimal_max,
                        },
                    )
                )

        # Apply total cap (by trimming tail results if needed)
        capped_results: list[RuleResult] = []
        running = 0.0
        for r in results:
            next_total = running + r.adjustment
            if abs(next_total) <= self.caps.total_abs_cap:
                capped_results.append(r)
                running = next_total
            else:
                # Stop adding more once we hit cap to keep behavior deterministic.
                break

        if capped_results and len(capped_results) != len(results):
            capped_results.append(
                RuleResult(
                    rule_name="rule_adjustment_capped",
                    rule_type="info",
                    adjustment=0.0,
                    reason=f"Rule adjustments capped at ±{self.caps.total_abs_cap:.0f} points.",
                )
            )

        return capped_results

