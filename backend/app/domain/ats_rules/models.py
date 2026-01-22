"""Pydantic models for ATS rule engine."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable

from pydantic import BaseModel, Field


class RuleType(str, Enum):
    """Types of ATS rules."""

    KEYWORD = "keyword"
    STRUCTURE = "structure"
    FORMATTING = "formatting"
    CONTENT = "content"


class ImpactType(str, Enum):
    """Types of score impact from rules."""

    BONUS = "bonus"
    PENALTY = "penalty"
    MULTIPLIER = "multiplier"


@dataclass
class ATSRule:
    """Definition of an ATS scoring rule."""

    id: str
    name: str
    category: RuleType
    condition: Callable[[dict, str | None, dict[str, Any]], bool]
    impact: ImpactType
    base_value: float
    max_impact: float | None = None
    min_impact: float | None = None
    priority: str = "medium"  # "high", "medium", "low"
    description: str = ""
    suggestion: str = ""


class RuleEvaluationResult(BaseModel):
    """Result of evaluating a single rule."""

    rule_id: str
    rule_name: str
    category: RuleType
    passed: bool
    impact_value: float = Field(..., ge=-100, le=100)
    max_impact: float | None = None
    min_impact: float | None = None
    message: str = ""
    suggestion: str = ""
    details: dict[str, Any] = Field(default_factory=dict)


class RuleEngineResult(BaseModel):
    """Aggregated results from all rule evaluations."""

    total_adjustment: float = Field(..., ge=-100, le=100)
    keyword_rules: list[RuleEvaluationResult] = Field(default_factory=list)
    structure_rules: list[RuleEvaluationResult] = Field(default_factory=list)
    formatting_rules: list[RuleEvaluationResult] = Field(default_factory=list)
    content_rules: list[RuleEvaluationResult] = Field(default_factory=list)
    all_rules: list[RuleEvaluationResult] = Field(default_factory=list)
    summary: dict[str, Any] = Field(default_factory=dict)
