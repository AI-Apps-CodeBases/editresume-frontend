import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

# Optional imports with fallbacks
try:
    from language_tool_python import LanguageTool

    LANGUAGETOOL_AVAILABLE = True
except ImportError:
    LANGUAGETOOL_AVAILABLE = False
    LanguageTool = None

try:
    import textstat

    TEXTSTAT_AVAILABLE = True
except ImportError:
    TEXTSTAT_AVAILABLE = False

try:
    import spacy
    from spacy.matcher import Matcher

    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    spacy = None

logger = logging.getLogger(__name__)


@dataclass
class GrammarIssue:
    message: str
    replacements: List[str]
    offset: int
    length: int
    rule_id: str
    category: str
    severity: str


@dataclass
class StyleIssue:
    type: str
    message: str
    suggestion: str
    severity: str
    score_impact: int


@dataclass
class StyleScore:
    overall_score: int
    grammar_score: int
    readability_score: int
    strength_score: int
    issues_count: int
    suggestions: List[str]


class GrammarStyleChecker:
    def __init__(self):
        # Initialize LanguageTool if available
        if LANGUAGETOOL_AVAILABLE:
            try:
                self.language_tool = LanguageTool("en-US")
                logger.info("LanguageTool initialized successfully")
            except Exception as e:
                logger.warning(f"LanguageTool initialization failed: {e}")
                self.language_tool = None
        else:
            logger.info("LanguageTool not available, using fallback grammar checking")
            self.language_tool = None

        # Initialize spaCy if available
        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load("en_core_web_sm")
                logger.info("spaCy model loaded successfully")
            except Exception as e:
                logger.warning(f"spaCy model loading failed: {e}")
                self.nlp = None
        else:
            logger.info("spaCy not available, using fallback text analysis")
            self.nlp = None

        # Weak verbs that should be replaced with stronger alternatives
        self.weak_verbs = {
            "did": ["executed", "implemented", "completed", "achieved"],
            "made": ["created", "developed", "produced", "delivered"],
            "got": ["obtained", "acquired", "secured", "achieved"],
            "put": ["placed", "positioned", "deployed", "implemented"],
            "set": ["established", "configured", "arranged", "organized"],
            "used": ["utilized", "leveraged", "applied", "employed"],
            "worked": ["collaborated", "operated", "functioned", "performed"],
            "helped": ["assisted", "supported", "facilitated", "enabled"],
            "looked": ["analyzed", "examined", "reviewed", "investigated"],
            "took": ["assumed", "accepted", "handled", "managed"],
            "gave": ["provided", "delivered", "supplied", "offered"],
            "went": ["traveled", "moved", "proceeded", "advanced"],
            "came": ["arrived", "emerged", "developed", "resulted"],
            "saw": ["observed", "identified", "discovered", "recognized"],
            "felt": ["experienced", "perceived", "noticed", "detected"],
            "seemed": ["appeared", "demonstrated", "indicated", "suggested"],
            "became": ["transformed into", "evolved into", "developed into"],
            "kept": ["maintained", "preserved", "sustained", "retained"],
            "started": ["initiated", "launched", "commenced", "began"],
            "finished": ["completed", "finalized", "concluded", "accomplished"],
        }

        # Passive voice patterns
        self.passive_patterns = [
            r"\b(?:was|were|is|are|been|being)\s+\w+ed\b",
            r"\b(?:was|were|is|are|been|being)\s+\w+en\b",
            r"\b(?:was|were|is|are|been|being)\s+\w+[^a-z]ed\b",
            r"\b(?:was|were|is|are|been|being)\s+\w+[^a-z]en\b",
        ]

    def check_grammar(self, text: str) -> List[GrammarIssue]:
        """Check text for grammar issues using LanguageTool or fallback"""
        if self.language_tool:
            try:
                matches = self.language_tool.check(text)
                issues = []

                for match in matches:
                    issue = GrammarIssue(
                        message=match.message,
                        replacements=match.replacements,
                        offset=match.offset,
                        length=match.errorLength,
                        rule_id=match.ruleId,
                        category=match.category,
                        severity=self._get_severity(match.ruleId),
                    )
                    issues.append(issue)

                return issues
            except Exception as e:
                logger.error(f"Grammar check failed: {e}")
                return []
        else:
            # Fallback grammar checking using basic rules
            return self._fallback_grammar_check(text)

    def check_passive_voice(self, text: str) -> List[StyleIssue]:
        """Detect passive voice usage"""
        issues = []

        for pattern in self.passive_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                issues.append(
                    StyleIssue(
                        type="passive_voice",
                        message=f"Passive voice detected: '{match.group()}'",
                        suggestion="Consider using active voice for stronger impact",
                        severity="medium",
                        score_impact=-2,
                    )
                )

        return issues

    def check_weak_verbs(self, text: str) -> List[StyleIssue]:
        """Detect weak verbs and suggest stronger alternatives"""
        issues = []

        if self.nlp:
            try:
                doc = self.nlp(text)

                for token in doc:
                    if token.pos_ == "VERB" and token.lemma_.lower() in self.weak_verbs:
                        verb = token.lemma_.lower()
                        suggestions = self.weak_verbs[verb]

                        issues.append(
                            StyleIssue(
                                type="weak_verb",
                                message=f"Weak verb detected: '{token.text}'",
                                suggestion=f"Consider using stronger verbs like: {', '.join(suggestions[:3])}",
                                severity="medium",
                                score_impact=-1,
                            )
                        )
            except Exception as e:
                logger.error(f"Weak verb check failed: {e}")
        else:
            # Fallback weak verb checking using simple text matching
            for verb, suggestions in self.weak_verbs.items():
                pattern = r"\b" + re.escape(verb) + r"\b"
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    issues.append(
                        StyleIssue(
                            type="weak_verb",
                            message=f"Weak verb detected: '{match.group()}'",
                            suggestion=f"Consider using stronger verbs like: {', '.join(suggestions[:3])}",
                            severity="medium",
                            score_impact=-1,
                        )
                    )

        return issues

    def check_readability(self, text: str) -> Tuple[int, List[StyleIssue]]:
        """Check text readability and provide suggestions"""
        issues = []

        if TEXTSTAT_AVAILABLE:
            try:
                # Flesch Reading Ease Score
                flesch_score = textstat.flesch_reading_ease(text)

                # Flesch-Kincaid Grade Level
                grade_level = textstat.flesch_kincaid_grade(text)

                # Average sentence length
                avg_sentence_length = textstat.avg_sentence_length(text)

                # Average syllables per word
                avg_syllables = textstat.avg_syllables_per_word(text)

                # Scoring based on resume standards
                score = 100

                if flesch_score < 30:
                    issues.append(
                        StyleIssue(
                            type="readability",
                            message="Text is very difficult to read",
                            suggestion="Use shorter sentences and simpler words",
                            severity="high",
                            score_impact=-5,
                        )
                    )
                    score -= 5
                elif flesch_score < 50:
                    issues.append(
                        StyleIssue(
                            type="readability",
                            message="Text is difficult to read",
                            suggestion="Consider simplifying complex sentences",
                            severity="medium",
                            score_impact=-3,
                        )
                    )
                    score -= 3

                if grade_level > 12:
                    issues.append(
                        StyleIssue(
                            type="readability",
                            message="Grade level too high for resume",
                            suggestion="Aim for 8th-10th grade reading level",
                            severity="medium",
                            score_impact=-2,
                        )
                    )
                    score -= 2

                if avg_sentence_length > 20:
                    issues.append(
                        StyleIssue(
                            type="readability",
                            message="Sentences are too long",
                            suggestion="Break long sentences into shorter ones",
                            severity="low",
                            score_impact=-1,
                        )
                    )
                    score -= 1

                if avg_syllables > 1.8:
                    issues.append(
                        StyleIssue(
                            type="readability",
                            message="Words are too complex",
                            suggestion="Use simpler, more direct words",
                            severity="low",
                            score_impact=-1,
                        )
                    )
                    score -= 1

                return max(0, score), issues

            except Exception as e:
                logger.error(f"Readability check failed: {e}")
                return 85, []  # Default score
        else:
            # Fallback readability checking using basic metrics
            return self._fallback_readability_check(text)

    def check_action_verbs(self, text: str) -> Tuple[int, List[StyleIssue]]:
        """Check for strong action verbs usage"""
        issues = []
        score = 100

        # Strong action verbs that are good for resumes
        strong_verbs = [
            "achieved",
            "accomplished",
            "administered",
            "analyzed",
            "built",
            "collaborated",
            "created",
            "delivered",
            "developed",
            "executed",
            "generated",
            "implemented",
            "improved",
            "increased",
            "launched",
            "led",
            "managed",
            "optimized",
            "produced",
            "reduced",
            "streamlined",
            "transformed",
            "utilized",
        ]

        if not self.nlp:
            return score, issues

        try:
            doc = self.nlp(text)
            verbs_found = []
            weak_verbs_count = 0

            for token in doc:
                if token.pos_ == "VERB":
                    verb = token.lemma_.lower()
                    if verb in strong_verbs:
                        verbs_found.append(verb)
                    elif verb in self.weak_verbs:
                        weak_verbs_count += 1

            # Calculate score based on verb usage
            total_verbs = len([t for t in doc if t.pos_ == "VERB"])
            if total_verbs > 0:
                strong_verb_ratio = len(verbs_found) / total_verbs
                weak_verb_ratio = weak_verbs_count / total_verbs

                if strong_verb_ratio < 0.3:
                    issues.append(
                        StyleIssue(
                            type="action_verbs",
                            message="Low usage of strong action verbs",
                            suggestion="Include more action verbs like: achieved, developed, implemented",
                            severity="medium",
                            score_impact=-3,
                        )
                    )
                    score -= 3

                if weak_verb_ratio > 0.4:
                    issues.append(
                        StyleIssue(
                            type="action_verbs",
                            message="Too many weak verbs detected",
                            suggestion="Replace weak verbs with stronger alternatives",
                            severity="high",
                            score_impact=-5,
                        )
                    )
                    score -= 5

            return max(0, score), issues

        except Exception as e:
            logger.error(f"Action verb check failed: {e}")
            return score, issues

    def calculate_style_score(self, text: str) -> StyleScore:
        """Calculate overall style score for the text"""
        grammar_issues = self.check_grammar(text)
        passive_issues = self.check_passive_voice(text)
        weak_verb_issues = self.check_weak_verbs(text)
        readability_score, readability_issues = self.check_readability(text)
        strength_score, strength_issues = self.check_action_verbs(text)

        all_issues = (
            grammar_issues
            + passive_issues
            + weak_verb_issues
            + readability_issues
            + strength_issues
        )

        # Calculate grammar score
        grammar_score = 100
        for issue in grammar_issues:
            if issue.severity == "high":
                grammar_score -= 3
            elif issue.severity == "medium":
                grammar_score -= 2
            else:
                grammar_score -= 1

        # Calculate overall score
        overall_score = (grammar_score + readability_score + strength_score) // 3

        # Generate suggestions
        suggestions = []
        if grammar_issues:
            suggestions.append(f"Fix {len(grammar_issues)} grammar issues")
        if passive_issues:
            suggestions.append(
                f"Convert {len(passive_issues)} passive voice sentences to active"
            )
        if weak_verb_issues:
            suggestions.append(
                f"Replace {len(weak_verb_issues)} weak verbs with stronger alternatives"
            )
        if readability_score < 70:
            suggestions.append("Improve readability with shorter sentences")
        if strength_score < 70:
            suggestions.append("Add more strong action verbs")

        return StyleScore(
            overall_score=max(0, overall_score),
            grammar_score=max(0, grammar_score),
            readability_score=max(0, readability_score),
            strength_score=max(0, strength_score),
            issues_count=len(all_issues),
            suggestions=suggestions,
        )

    def _get_severity(self, rule_id: str) -> str:
        """Determine severity based on rule ID"""
        high_severity_rules = [
            "MORFOLOGIK_RULE_EN_US",  # Spelling errors
            "EN_QUOTES",  # Quote usage
            "EN_DASHES",  # Dash usage
        ]

        medium_severity_rules = [
            "EN_A_VS_AN",  # Article usage
            "EN_COMPOUNDS",  # Compound words
            "EN_PUNCTUATION",  # Punctuation
        ]

        if any(rule in rule_id for rule in high_severity_rules):
            return "high"
        elif any(rule in rule_id for rule in medium_severity_rules):
            return "medium"
        else:
            return "low"

    def get_improvement_suggestions(self, text: str) -> List[str]:
        """Get comprehensive improvement suggestions"""
        suggestions = []

        # Check for common resume issues
        if len(text) > 1000:
            suggestions.append(
                "Consider shortening the content - resumes should be concise"
            )

        if text.count(".") / len(text.split()) > 0.3:
            suggestions.append(
                "Too many periods - consider using bullet points instead"
            )

        if "I " in text or " my " in text or " me " in text:
            suggestions.append(
                "Remove first-person pronouns - use third person or action verbs"
            )

        if text.count("responsibilities") > 0:
            suggestions.append(
                "Replace 'responsibilities' with 'achievements' or specific results"
            )

        return suggestions

    def _fallback_grammar_check(self, text: str) -> List[GrammarIssue]:
        """Fallback grammar checking using basic rules"""
        issues = []

        # Check for common grammar issues
        # Double spaces
        if "  " in text:
            issues.append(
                GrammarIssue(
                    message="Double space detected",
                    replacements=[" "],
                    offset=text.find("  "),
                    length=2,
                    rule_id="DOUBLE_SPACE",
                    category="TYPOGRAPHY",
                    severity="low",
                )
            )

        # Missing spaces after periods
        pattern = r"\.([A-Z])"
        matches = re.finditer(pattern, text)
        for match in matches:
            issues.append(
                GrammarIssue(
                    message="Missing space after period",
                    replacements=[f". {match.group(1)}"],
                    offset=match.start(),
                    length=match.end() - match.start(),
                    rule_id="MISSING_SPACE",
                    category="PUNCTUATION",
                    severity="medium",
                )
            )

        # Common typos
        common_typos = {
            "teh": "the",
            "adn": "and",
            "recieve": "receive",
            "seperate": "separate",
            "definately": "definitely",
        }

        for typo, correction in common_typos.items():
            pattern = r"\b" + re.escape(typo) + r"\b"
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                issues.append(
                    GrammarIssue(
                        message=f"Possible typo: '{match.group()}'",
                        replacements=[correction],
                        offset=match.start(),
                        length=match.end() - match.start(),
                        rule_id="TYPO",
                        category="TYPOS",
                        severity="medium",
                    )
                )

        return issues

    def _fallback_readability_check(self, text: str) -> Tuple[int, List[StyleIssue]]:
        """Fallback readability checking using basic metrics"""
        issues = []
        score = 100

        # Basic sentence length check
        sentences = re.split(r"[.!?]+", text)
        avg_sentence_length = sum(len(s.split()) for s in sentences if s.strip()) / max(
            len([s for s in sentences if s.strip()]), 1
        )

        if avg_sentence_length > 25:
            issues.append(
                StyleIssue(
                    type="readability",
                    message="Sentences are too long",
                    suggestion="Break long sentences into shorter ones",
                    severity="medium",
                    score_impact=-3,
                )
            )
            score -= 3
        elif avg_sentence_length > 20:
            issues.append(
                StyleIssue(
                    type="readability",
                    message="Sentences are moderately long",
                    suggestion="Consider shortening some sentences",
                    severity="low",
                    score_impact=-1,
                )
            )
            score -= 1

        # Basic word complexity check
        words = re.findall(r"\b\w+\b", text.lower())
        complex_words = [w for w in words if len(w) > 8]
        complexity_ratio = len(complex_words) / max(len(words), 1)

        if complexity_ratio > 0.3:
            issues.append(
                StyleIssue(
                    type="readability",
                    message="Too many complex words",
                    suggestion="Use simpler, more direct words",
                    severity="medium",
                    score_impact=-2,
                )
            )
            score -= 2
        elif complexity_ratio > 0.2:
            issues.append(
                StyleIssue(
                    type="readability",
                    message="Some complex words detected",
                    suggestion="Consider simplifying where possible",
                    severity="low",
                    score_impact=-1,
                )
            )
            score -= 1

        return max(0, score), issues
