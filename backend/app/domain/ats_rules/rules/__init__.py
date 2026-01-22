"""ATS rule definitions."""

from app.domain.ats_rules.rules.content_rules import get_content_rules
from app.domain.ats_rules.rules.formatting_rules import get_formatting_rules
from app.domain.ats_rules.rules.keyword_rules import get_keyword_rules
from app.domain.ats_rules.rules.structure_rules import get_structure_rules

__all__ = [
    "get_keyword_rules",
    "get_structure_rules",
    "get_formatting_rules",
    "get_content_rules",
]
