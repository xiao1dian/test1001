"""Shared text cleanup for speeches and blocks."""

from __future__ import annotations

import re

ELLIPSIS = re.compile(r"…|\.\.\.")
MIDWORD_CUT = re.compile(r"\b\w\s+(This|The|And|But)\s", re.I)
FILLER_OPENERS = re.compile(
    r"^(Regulation of|According to|The study|The report|Research shows|It is|This is)\s",
    re.I,
)


def clean_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip())


def first_sentences(text: str, count: int = 2, max_chars: int = 420) -> str:
    """Return complete sentences only — never cut mid-word."""
    text = clean_whitespace(text)
    if not text:
        return ""
    parts = re.split(r"(?<=[.!?])\s+", text)
    chosen: list[str] = []
    total = 0
    for part in parts:
        part = part.strip()
        if len(part) < 12:
            continue
        if total + len(part) > max_chars and chosen:
            break
        chosen.append(part)
        total += len(part)
        if len(chosen) >= count:
            break
    return " ".join(chosen)


def argument_title(point: str, evidence: str = "") -> str:
    """Turn a raw source sentence into a short contention headline."""
    source = clean_whitespace(ELLIPSIS.sub("", point))
    if source.lower().startswith(("supporting evidence", "counter-argument")):
        source = clean_whitespace(ELLIPSIS.sub("", evidence)) or source

    source = FILLER_OPENERS.sub("", source).strip(" .")

    if "," in source:
        lead = source.split(",", 1)[0].strip()
        if 20 <= len(lead) <= 90:
            source = lead

    words = source.split()
    if len(words) <= 12:
        return source.rstrip(".")

    chunk = " ".join(words[:12]).rstrip(",;:")
    # Drop trailing incomplete function words
    chunk = re.sub(r"\b(and|or|the|a|an|of|for|to|in|on|with|by|that|which|when|where|while|because|if|as|is|are|was|were|has|have|will|can|should|must)$", "", chunk, flags=re.I)
    return chunk.strip().rstrip(".") or " ".join(words[:8]).rstrip(".")


def evidence_excerpt(evidence: str, point: str, max_sentences: int = 2) -> str:
    """Evidence body distinct from the headline."""
    ev = clean_whitespace(evidence)
    pt = clean_whitespace(ELLIPSIS.sub("", point))
    if not ev:
        return ""

    parts = re.split(r"(?<=[.!?])\s+", ev)
    if pt and len(pt) > 20:
        pt_lower = pt.lower()
        while parts and parts[0].lower().startswith(pt_lower[: min(45, len(pt_lower))]):
            parts.pop(0)
        if not parts:
            return first_sentences(ev, count=max_sentences, max_chars=280)

    chosen = [clean_whitespace(p) for p in parts if len(p.strip()) > 15][:max_sentences]
    merged = " ".join(chosen)
    if merged and merged[0].islower():
        merged = merged[0].upper() + merged[1:]
    return merged if merged else first_sentences(ev, count=max_sentences, max_chars=280)


def has_truncation_artifact(text: str) -> bool:
    if ELLIPSIS.search(text):
        return True
    if re.search(r"\b\w\s+This background\b", text):
        return True
    if re.search(r"\b\w\s+According\b", text):
        return True
    return False


def repetition_score(text: str, phrase: str) -> int:
    return len(re.findall(re.escape(phrase), text, re.I))
