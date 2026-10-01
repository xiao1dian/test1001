"""Analyze debate speeches and provide actionable coaching feedback."""

from __future__ import annotations

import re
from typing import Any

from services.text_utils import has_truncation_artifact, repetition_score

FILLERS = re.compile(
    r"\b(um|uh|like|you know|basically|literally|sort of|kind of|actually|just)\b",
    re.IGNORECASE,
)

WEAK_PHRASES = [
    "i think", "i believe", "maybe", "probably", "kind of", "sort of",
    "things like that", "and stuff", "etc",
]

STRONG_DEBATE_WORDS = [
    "impact", "magnitude", "probability", "timeframe", "weigh", "extend",
    "contention", "resolution", "evidence", "according to", "therefore",
    "because", "proves", "demonstrates", "significant", "critical",
]

CITATION_PATTERNS = re.compile(
    r"(https?://|according to|source:|wikipedia|britannica|\.edu|doi\.org|research|study|data)",
    re.IGNORECASE,
)


def _grade(score: int) -> str:
    if score >= 92:
        return "A"
    if score >= 85:
        return "B+"
    if score >= 78:
        return "B"
    if score >= 70:
        return "C+"
    if score >= 60:
        return "C"
    return "D"


def _sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p.strip() for p in parts if len(p.strip()) > 10]


def analyze_speech(
    speech: str,
    target_minutes: int = 4,
    topic: str = "",
    side: str = "aff",
) -> dict[str, Any]:
    """Rule-based speech analysis — always available, no API key needed."""
    speech = speech.strip()
    if not speech:
        raise ValueError("Speech text is empty.")

    words = speech.split()
    word_count = len(words)
    target_words = target_minutes * 150
    sentences = _sentences(speech)
    avg_sentence_len = word_count / max(len(sentences), 1)
    est_minutes = round(word_count / 150, 1)

    fillers = FILLERS.findall(speech)
    filler_count = len(fillers)
    citations = len(CITATION_PATTERNS.findall(speech))
    strong_words = sum(1 for w in STRONG_DEBATE_WORDS if w in speech.lower())
    weak_hits = [p for p in WEAK_PHRASES if p in speech.lower()]

    has_intro = any(w in speech.lower()[:300] for w in ("good afternoon", "good morning", "resolution", "judge"))
    has_conclusion = any(w in speech.lower()[-400:] for w in ("thank you", "vote", "affirm", "negate", "therefore", "conclusion"))
    has_contention = bool(re.search(r"contention|argument|first|second|my case", speech, re.I))

    strengths: list[str] = []
    improvements: list[str] = []
    score = 70  # base

    # Timing
    timing_status = "on_target"
    if word_count < target_words * 0.65:
        timing_status = "too_short"
        improvements.append(
            f"Speech is short ({word_count} words vs ~{target_words} target). Add another contention or extend impacts."
        )
        score -= 12
    elif word_count > target_words * 1.35:
        timing_status = "too_long"
        improvements.append(
            f"Speech may run over time ({word_count} words ≈ {est_minutes} min vs {target_minutes} min target). Cut repetition."
        )
        score -= 8
    else:
        strengths.append(f"Length is appropriate (~{word_count} words, ≈{est_minutes} min at debate pace).")
        score += 8

    # Citations
    if citations >= 3:
        strengths.append(f"Strong source integration ({citations} citation indicators found).")
        score += 12
    elif citations >= 1:
        improvements.append("Add more cited evidence — aim for at least 3 source references.")
        score += 4
    else:
        improvements.append("No clear citations detected. Debate speeches need sourced evidence.")
        score -= 15

    # Structure
    if has_intro:
        strengths.append("Clear opening that frames the speech.")
        score += 5
    else:
        improvements.append("Add a formal introduction — greet the judge and state the resolution.")
        score -= 5

    if has_conclusion:
        strengths.append("Speech closes with a clear conclusion.")
        score += 5
    else:
        improvements.append("End with a explicit voting issue — tell the judge why to vote for you.")
        score -= 5

    if has_contention:
        strengths.append("Arguments are organized into identifiable points.")
        score += 5
    else:
        improvements.append("Structure arguments as numbered contentions for clarity.")
        score -= 5

    # Delivery
    if filler_count == 0:
        strengths.append("No filler words detected — clean delivery.")
        score += 5
    elif filler_count <= 3:
        improvements.append(f"Reduce filler words ({filler_count} found: {', '.join(set(f.lower() for f in fillers[:3]))}).")
        score -= 3
    else:
        improvements.append(f"Too many filler words ({filler_count}). Practice pausing instead of saying 'um' or 'like'.")
        score -= 8

    if weak_hits:
        improvements.append(f"Avoid weak phrasing: {', '.join(weak_hits[:3])}. State claims with confidence.")
        score -= 4

    # Quality: truncation / copy-paste artifacts
    if has_truncation_artifact(speech):
        improvements.append("Speech has cut-off sentences or ellipsis artifacts — regenerate or edit for complete thoughts.")
        score -= 15

    generic_hits = repetition_score(speech, "This evidence establishes")
    generic_hits += repetition_score(speech, "When judges evaluate magnitude")
    generic_hits += repetition_score(speech, "justifies a ballot")
    if generic_hits >= 2:
        improvements.append("Too much repeated template language — vary your wording and make each contention distinct.")
        score -= 12

    # Duplicate / repeated sentences
    sents = _sentences(speech)
    seen_starts: set[str] = set()
    dupes = 0
    for s in sents:
        start = s[:50].lower()
        if start in seen_starts:
            dupes += 1
        seen_starts.add(start)
    if dupes >= 1:
        improvements.append("Some sentences repeat — tighten each contention so every line adds new information.")
        score -= 10

    if re.search(r"(.{40,})\1", speech.replace("\n", " ")):
        improvements.append("Some sentences repeat the same phrasing — tighten and deduplicate.")
        score -= 8

    # Sentence variety
    if avg_sentence_len > 35:
        improvements.append("Sentences are long on average — break them up for clearer delivery.")
        score -= 4
    elif 12 <= avg_sentence_len <= 28:
        strengths.append("Sentence length is good for spoken delivery.")
        score += 4

    # Debate technique
    if strong_words >= 5:
        strengths.append("Uses strong debate terminology (impacts, weighing, evidence).")
        score += 8
    else:
        improvements.append("Include impact analysis — explain magnitude, probability, and timeframe.")
        score -= 5

    score = max(0, min(100, score))

    categories = {
        "structure": {
            "score": min(100, (30 if has_intro else 0) + (30 if has_conclusion else 0) + (40 if has_contention else 0)),
            "label": "Structure",
        },
        "evidence": {
            "score": min(100, citations * 25),
            "label": "Evidence & Citations",
        },
        "timing": {
            "score": 100 if timing_status == "on_target" else (60 if timing_status == "too_short" else 70),
            "label": "Timing",
        },
        "delivery": {
            "score": max(0, 100 - filler_count * 8 - len(weak_hits) * 5),
            "label": "Delivery",
        },
    }

    return {
        "score": score,
        "grade": _grade(score),
        "word_count": word_count,
        "target_words": target_words,
        "estimated_minutes": est_minutes,
        "target_minutes": target_minutes,
        "timing_status": timing_status,
        "sentence_count": len(sentences),
        "avg_sentence_length": round(avg_sentence_len, 1),
        "citation_count": citations,
        "filler_count": filler_count,
        "strengths": strengths[:6],
        "improvements": improvements[:6],
        "categories": categories,
        "topic": topic,
        "side": side,
    }
