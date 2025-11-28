"""Grammar and style checking agent."""

from __future__ import annotations

from app.services.grammar_service import GrammarStyleChecker

logger = None
try:
    import logging

    logger = logging.getLogger(__name__)
except:
    pass


class GrammarAgent:
    """Agent for grammar and style checking."""

    def __init__(self):
        """Initialize the grammar agent."""
        try:
            self.grammar_checker = GrammarStyleChecker()
        except Exception as e:
            if logger:
                logger.error(f"Failed to initialize GrammarStyleChecker: {e}")
            self.grammar_checker = None

    def check_grammar_style(
        self, text: str, check_type: str = "all"
    ) -> dict:
        """Check grammar and style of text."""
        if not text.strip():
            return {"success": False, "error": "No text provided for checking"}

        if logger:
            logger.info(f"Grammar/style check requested for {len(text)} characters")

        if check_type in ["grammar", "all"]:
            grammar_issues = self.grammar_checker.check_grammar(text)
        else:
            grammar_issues = []

        if check_type in ["style", "all"]:
            passive_issues = self.grammar_checker.check_passive_voice(text)
            weak_verb_issues = self.grammar_checker.check_weak_verbs(text)
            readability_score, readability_issues = (
                self.grammar_checker.check_readability(text)
            )
            strength_score, strength_issues = (
                self.grammar_checker.check_action_verbs(text)
            )
            style_score_obj = self.grammar_checker.calculate_style_score(text)
            style_score_value = style_score_obj.overall_score if style_score_obj else 0
        else:
            passive_issues = []
            weak_verb_issues = []
            readability_score = 0
            readability_issues = []
            strength_score = 0
            strength_issues = []
            style_score_obj = None
            style_score_value = 0

        return {
            "success": True,
            "grammar_issues": grammar_issues,
            "passive_voice_issues": passive_issues,
            "weak_verb_issues": weak_verb_issues,
            "readability": {
                "score": readability_score,
                "issues": readability_issues,
            },
            "strength": {
                "score": strength_score,
                "issues": strength_issues,
            },
            "style_score": style_score_value,
            "overall_score": (
                (100 - len(grammar_issues) * 5)
                + style_score_value
                + readability_score
                + strength_score
            )
            / 4,
        }

