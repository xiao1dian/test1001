"""Extract searchable keywords from debate resolutions."""

from __future__ import annotations

import re

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might", "must",
    "shall", "can", "need", "it", "its", "this", "that", "these", "those", "not", "no",
    "if", "then", "than", "when", "what", "which", "who", "whom", "how", "why", "where",
    "all", "each", "every", "both", "few", "more", "most", "other", "some", "such",
    "only", "own", "same", "so", "too", "very", "just", "about", "into", "through",
    "during", "before", "after", "above", "below", "up", "down", "out", "off", "over",
    "under", "again", "further", "once", "whether",
}

DEBATE_PREFIX = re.compile(
    r"^(should|shall|must|ought to|is it|are|is|do|does|did|will|would|could|can|"
    r"whether|if|to what extent|debate on|debate about|motion:|resolved:)\s+",
    re.IGNORECASE,
)

TRAILING_CLAUSE = re.compile(
    r"\s+(be implemented|be banned|be abolished|be legalized|be allowed|"
    r"be required|be adopted|be supported|be opposed|or not)\??$",
    re.IGNORECASE,
)


def extract_core_topic(topic: str) -> str:
    text = topic.strip().rstrip("?").strip()
    text = DEBATE_PREFIX.sub("", text).strip()
    text = TRAILING_CLAUSE.sub("", text).strip()
    text = re.sub(r"^(that|the)\s+", "", text, flags=re.IGNORECASE)
    return text or topic.strip()


def topic_keywords(topic: str, core: str | None = None) -> list[str]:
    core = core or extract_core_topic(topic)
    words = re.findall(r"[a-zA-Z\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]{3,}", core.lower())
    keywords = [w for w in words if w not in STOPWORDS]
    # Keep bigrams for phrases like "basic income"
    tokens = core.lower().split()
    for i in range(len(tokens) - 1):
        if tokens[i] not in STOPWORDS and tokens[i + 1] not in STOPWORDS:
            keywords.append(f"{tokens[i]} {tokens[i+1]}")
    return list(dict.fromkeys(keywords))


def is_relevant(source: dict[str, Any], keywords: list[str], core: str = "", min_matches: int = 1) -> bool:
    """Check if source text contains topic keywords."""
    if not keywords:
        return True
    haystack = " ".join(
        [
            source.get("title", ""),
            source.get("snippet", ""),
            source.get("content", ""),
        ]
    ).lower()
    core_lower = core.lower().strip()
    if core_lower and core_lower in haystack:
        return True
    # Require a multi-word phrase match when available
    phrases = [kw for kw in keywords if " " in kw]
    if phrases and any(p in haystack for p in phrases):
        return True
    matches = sum(1 for kw in keywords if kw in haystack)
    return matches >= max(min_matches, 2)


def english_search_terms(topic: str, core: str) -> list[str]:
    terms = []
    for candidate in (core, topic.rstrip("?").strip()):
        if candidate and candidate not in terms:
            terms.append(candidate)
    return terms
