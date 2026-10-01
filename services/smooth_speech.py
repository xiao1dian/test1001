"""Generate smooth, spoken-word debate speeches from research blocks."""

from __future__ import annotations

import re
from typing import Any

from services.text_utils import argument_title, clean_whitespace, evidence_excerpt, first_sentences

# Varied transition openers — one per contention, no repeated boilerplate
CONTENTION_OPENERS = [
    "First,",
    "Second,",
    "Third,",
    "Fourth,",
    "Next,",
    "Finally,",
]

IMPACT_LINES = [
    "That means real consequences for voters, institutions, and policy outcomes.",
    "On magnitude and probability, this outweighs anything on the other side.",
    "This is not abstract — it changes how the resolution plays out in practice.",
    "Extend this in later speeches; it is enough to win the round on its own.",
    "The link chain is clear: evidence → mechanism → impact.",
]

WEIGH_LINES = [
    "Compare our impacts to theirs — ours are larger, more likely, and happen sooner.",
    "Even if you grant one of their points, our side still wins on the preponderance of evidence.",
    "Layered arguments mean you can vote for us even if you disagree with one link.",
]

CLOSING: dict[tuple[str, str], str] = {
    ("aff", "constructive"): (
        "In sum, the affirmative meets every burden in this round. "
        "Vote Pro — and I welcome cross-examination."
    ),
    ("neg", "constructive"): (
        "The resolution fails on risk, evidence, and impact comparison. "
        "Vote Con — cross-examination."
    ),
    ("aff", "rebuttal"): "Extend framework and our strongest contention. The affirmative still wins. Thank you.",
    ("neg", "rebuttal"): "Their case collapses under scrutiny. The negative position stands. Thank you.",
    ("aff", "summary"): "Collapse to our best argument, weigh impacts, and vote Pro. Thank you.",
    ("neg", "summary"): "Weigh risk over rhetoric — vote Con. Thank you.",
    ("aff", "final"): "Vote Pro. Thank you.",
    ("neg", "final"): "Vote Con. Thank you.",
}


def _side_label(side: str) -> tuple[str, str]:
    if side == "aff":
        return "affirmative", "Pro"
    return "negative", "Con"


def _intro(topic: str, side: str, speech_kind: str) -> str:
    side_word, procon = _side_label(side)
    topic_clean = topic.rstrip("?").strip()

    if speech_kind == "rebuttal":
        return (
            f"Good afternoon. This rebuttal defends the {side_word} side on {topic_clean}. "
            f"I will extend our case, answer their attacks, and show why {procon} still wins."
        )
    if speech_kind == "summary":
        return (
            f"Good afternoon. This summary explains why {procon} wins {topic_clean} — "
            f"on evidence, impacts, and weighing."
        )
    if speech_kind == "final":
        return f"Judge, {topic_clean} comes down to one question — and {procon} wins it."
    return (
        f"Good afternoon. Resolved: {topic_clean}. "
        f"I am {procon}, and I will show why the {side_word} position is correct."
    )


def _ld_framework(side: str) -> str:
    if side == "aff":
        return (
            "Framework first: value societal welfare; criterion maximizing net benefits while "
            "protecting rights. Weigh every argument through that lens."
        )
    return (
        "Framework: prudence — minimize harm and avoid unintended consequences. "
        "The affirmative must prove their plan works; they have not."
    )


def _contention_block(num: int, arg: dict[str, Any]) -> str:
    title = argument_title(arg.get("point", ""), arg.get("evidence", ""))
    body = evidence_excerpt(arg.get("evidence", ""), arg.get("point", ""))
    inst = arg.get("institution", "Source")
    url = arg.get("source_url", "")

    opener = CONTENTION_OPENERS[num] if num < len(CONTENTION_OPENERS) else "Also,"
    impact = IMPACT_LINES[num % len(IMPACT_LINES)]

    segment = f"{opener} {title}."
    if body and body.lower() not in title.lower():
        segment += f" {body.rstrip('.') + '.'}"
    segment += f" {inst} documents this."
    if url:
        segment += f" Source: {url}."
    segment += f" {impact}"
    return segment


def _overview_paragraph(overview: str) -> str:
    snippet = first_sentences(overview, count=2, max_chars=380)
    if not snippet:
        return ""
    return f"Background: {snippet}"


def _topic_tokens(topic: str) -> set[str]:
    stop = {"should", "the", "and", "for", "that", "with", "from", "this", "have", "been", "will", "would", "could", "government", "governments"}
    return {w.lower() for w in re.findall(r"\w{3,}", topic) if w.lower() not in stop}


def _score_arg(arg: dict[str, Any], topic_tokens: set[str], side: str) -> int:
    text = f"{arg.get('point', '')} {arg.get('evidence', '')}".lower()
    score = sum(2 for t in topic_tokens if t in text)
    if side == "aff":
        if re.search(r"\b(deregulation|deregulate)\b", text):
            score -= 10
        if re.search(r"\b(regulation|regulate|oversight|safety|protect|benefit|support|require|mandate|govern)\b", text):
            score += 3
    else:
        if re.search(r"\b(deregulation|freedom|innovation|burden|overreach|stifle|market)\b", text):
            score += 3
        if re.search(r"\b(must regulate|strict regulation|ban ai)\b", text):
            score -= 3
    if text.startswith("supporting evidence") or text.startswith("counter-argument"):
        score -= 1
    return score


def _pick_args(side_args: list[dict[str, Any]], blocks: dict[str, Any], side: str, limit: int, topic: str = "") -> list[dict[str, Any]]:
    tokens = _topic_tokens(topic)
    pool = [a for a in side_args if a.get("evidence")]
    pool.sort(key=lambda a: _score_arg(a, tokens, side), reverse=True)
    pool = [a for a in pool if _score_arg(a, tokens, side) >= 0]
    args = pool[:limit]
    if len(args) < 2:
        fallback = blocks.get("affirmative" if side == "aff" else "negative", [])
        seen = {a.get("evidence", "")[:60] for a in args}
        for a in sorted(fallback, key=lambda x: _score_arg(x, tokens, side), reverse=True):
            key = a.get("evidence", "")[:60]
            if key and key not in seen:
                args.append(a)
                seen.add(key)
            if len(args) >= limit:
                break
    return args[:limit]


def _closing(side: str, speech_kind: str) -> str:
    return CLOSING.get((side, speech_kind)) or CLOSING.get((side, "constructive"), "Thank you.")


def build_smooth_speech(
    topic: str,
    blocks: dict[str, Any],
    side_args: list[dict[str, Any]],
    side: str,
    speech_kind: str = "constructive",
    overview: str = "",
    debate_format: str = "pf",
    target_minutes: int = 4,
) -> str:
    """Build a flowing spoken-word speech from argument blocks."""
    target_words = target_minutes * 150
    parts: list[str] = [_intro(topic, side, speech_kind)]

    if debate_format == "ld" and speech_kind == "constructive":
        parts.append(_ld_framework(side))

    if overview and speech_kind in ("constructive", "summary"):
        ov = _overview_paragraph(overview)
        if ov:
            parts.append(ov)

    definitions = blocks.get("definitions", [])
    if definitions and speech_kind == "constructive":
        d = definitions[0]
        defn = first_sentences(d.get("definition", ""), count=1, max_chars=200)
        if defn:
            parts.append(f"Definitions: {d.get('term', topic)} — {defn}")

    arg_limit = 4 if speech_kind != "final" else 1
    if speech_kind == "rebuttal":
        arg_limit = 2
    args = _pick_args(side_args, blocks, side, arg_limit, topic)

    for i, arg in enumerate(args):
        parts.append(_contention_block(i, arg))

    for s in blocks.get("key_statistics", [])[:2]:
        ctx = first_sentences(s.get("context", s.get("stat", "")), count=1, max_chars=160)
        inst = s.get("institution", "Research")
        if ctx:
            parts.append(f"Data point: {ctx} ({inst}).")

    if speech_kind == "constructive" and len(args) >= 2:
        parts.append(WEIGH_LINES[0])

    if speech_kind == "rebuttal":
        for p in blocks.get("rebuttal_prep", [])[:2]:
            claim = clean_whitespace(p.get("anticipated_claim", ""))[:100]
            angle = first_sentences(p.get("response_angle", ""), count=1, max_chars=180)
            if claim and angle:
                parts.append(f"They argue {claim} — but {angle}")
        parts.append(
            "Drop their weakest link; extend our strongest impact. We win on weighing."
        )

    if speech_kind == "summary":
        parts.append(
            "Our evidence comes from encyclopedias, universities, and policy institutes — "
            "not speculation. Collapse the debate to our best argument."
        )

    parts.append(_closing(side, speech_kind))

    text = "\n\n".join(p for p in parts if p.strip())

    # Expand lightly if still short of target (add extra stats / args)
    words = len(text.split())
    if words < target_words * 0.75 and speech_kind == "constructive":
        extras = _pick_args(side_args, blocks, side, 6, topic)[len(args) :]
        extra_parts = [_contention_block(len(args) + i, a) for i, a in enumerate(extras[:2])]
        if extra_parts:
            text = text.replace(_closing(side, speech_kind), "")
            text = "\n\n".join([text] + extra_parts + [_closing(side, speech_kind)])

    return text


def detect_speech_kind(speech_type: str) -> str:
    st = speech_type.lower()
    if "rebuttal" in st or st in ("1ar", "2nr"):
        return "rebuttal"
    if "summary" in st or "whip" in st or st == "reply":
        return "summary"
    if "final" in st or "focus" in st:
        return "final"
    return "constructive"
