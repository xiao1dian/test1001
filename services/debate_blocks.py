"""Build rich debate blocks from all gathered authoritative sources."""

from __future__ import annotations

import re
from typing import Any

POSITIVE_HINTS = re.compile(
    r"\b(benefit|advantage|support|supports|successful|success|effective|effectively|"
    r"improve|improves|growth|positive|proven|essential|necessary|important|help|helps|"
    r"protect|protects|reduce|reduces|increase|increases|strong|stronger|best|better|"
    r"favor|favour|argue for|in favor|in favour|proponent|advocate|"
    r"ventaja|beneficio|apoyo|éxito|eficaz|mejora|positivo|"
    r"avantage|bénéfice|soutien|succès|efficace|améliore|"
    r"优势|好处|支持|成功|有效|改善|积极|有利)\b",
    re.IGNORECASE,
)

NEGATIVE_HINTS = re.compile(
    r"\b(risk|risks|harm|harms|danger|dangerous|fail|fails|failure|cost|costs|"
    r"problem|problems|issue|issues|concern|concerns|critic|criticism|critical|"
    r"against|oppose|opposes|opposition|negative|drawback|drawbacks|flaw|flaws|"
    r"weak|weakness|controvers|debate|challenge|challenges|limitation|"
    r"riesgo|daño|peligro|falla|costo|problema|crítica|"
    r"risque|dommage|danger|échec|coût|problème|critique|"
    r"风险|危害|失败|成本|问题|批评|争议|不利|缺点)\b",
    re.IGNORECASE,
)

STAT_HINTS = re.compile(
    r"(\d+[\d,.]*\s*(%|percent|million|billion|thousand|万|億|百万|十亿|"
    r"por ciento|millones|milliards|pour cent|millionen|milliarden)|"
    r"\b(19|20)\d{2}\b|\b(study|studies|research|survey|report|data|statistics|"
    r"finding|findings|analysis|meta-analysis|"
    r"estudio|investigación|étude|recherche|研究|统计|调查))\b",
    re.IGNORECASE,
)

PRO_QUERY = re.compile(r"\b(pro|pros|benefit|advantage|support|for|in favor|in favour)\b", re.I)
CON_QUERY = re.compile(r"\b(con|cons|against|oppose|criticism|risk|drawback)\b", re.I)


def _text_from_source(src: dict[str, Any]) -> str:
    return (src.get("content") or src.get("snippet") or "").strip()


def _sentences_from_source(src: dict[str, Any]) -> list[str]:
    text = _text_from_source(src)
    if not text:
        return []
    parts = re.split(r"(?<=[.!?。！？])\s+", re.sub(r"\s+", " ", text))
    return [p.strip() for p in parts if len(p.strip()) > 25]


def _make_block(point: str, evidence: str, source: dict[str, Any]) -> dict[str, Any]:
    return {
        "point": point,
        "evidence": evidence,
        "source_title": source.get("title", "Source"),
        "source_url": source.get("url", ""),
        "institution": source.get("institution", "Web"),
    }


def _headline(sentence: str, max_len: int = 110) -> str:
    from services.text_utils import argument_title

    return argument_title(sentence, sentence)[:max_len]


def classify_sentence(sentence: str, source: dict[str, Any] | None = None) -> str:
    title_snip = ""
    if source:
        title_snip = f"{source.get('title', '')} {source.get('snippet', '')}"
    combined = f"{sentence} {title_snip}"
    pos = len(POSITIVE_HINTS.findall(combined))
    neg = len(NEGATIVE_HINTS.findall(combined))
    if PRO_QUERY.search(title_snip):
        pos += 2
    if CON_QUERY.search(title_snip):
        neg += 2
    if pos > neg and pos > 0:
        return "affirmative"
    if neg > pos and neg > 0:
        return "negative"
    if STAT_HINTS.search(sentence):
        return "statistic"
    return "neutral"


def build_blocks(
    topic: str,
    wiki_sources: list[dict[str, Any]],
    web_sources: list[dict[str, Any]],
) -> dict[str, Any]:
    all_sources = wiki_sources + web_sources

    overview_parts: list[str] = []
    for src in all_sources:
        text = _text_from_source(src)
        if text and src.get("institution_type") in ("encyclopedia", "university", "think_tank"):
            overview_parts.append(text[:800])
        if len(overview_parts) >= 4:
            break

    if not overview_parts:
        for src in all_sources[:3]:
            text = _text_from_source(src)
            if text:
                overview_parts.append(text[:600])

    overview = "\n\n".join(overview_parts).strip()
    if not overview:
        overview = f"Research gathered on: {topic}"

    affirmative: list[dict[str, Any]] = []
    negative: list[dict[str, Any]] = []
    statistics: list[dict[str, Any]] = []
    definitions: list[dict[str, Any]] = []
    rebuttal_prep: list[dict[str, Any]] = []
    seen_evidence: set[str] = set()

    for src in all_sources:
        for sentence in _sentences_from_source(src):
            key = sentence[:80].lower()
            if key in seen_evidence:
                continue
            seen_evidence.add(key)

            bucket = classify_sentence(sentence, src)
            if bucket == "affirmative" and len(affirmative) < 12:
                affirmative.append(_make_block(_headline(sentence), sentence, src))
            elif bucket == "negative" and len(negative) < 12:
                negative.append(_make_block(_headline(sentence), sentence, src))
            elif bucket == "statistic" and len(statistics) < 10:
                statistics.append(
                    {
                        "stat": _headline(sentence, 130),
                        "context": sentence,
                        "source_title": src.get("title", "Source"),
                        "source_url": src.get("url", ""),
                        "institution": src.get("institution", "Web"),
                    }
                )

    # Pull pro/con from titles explicitly about pros and cons
    for src in web_sources:
        title_lower = src.get("title", "").lower()
        text = _text_from_source(src)
        if not text:
            continue
        if any(w in title_lower for w in ("pros and cons", "pro and con", "for and against", "debate")):
            sents = _sentences_from_source(src)
            mid = len(sents) // 2 or 1
            for s in sents[:mid]:
                if len(affirmative) < 12:
                    affirmative.append(_make_block(_headline(s), s, src))
            for s in sents[mid:]:
                if len(negative) < 12:
                    negative.append(_make_block(_headline(s), s, src))

    # Wikipedia definition
    for src in wiki_sources[:1]:
        if src.get("description"):
            definitions.append(
                {
                    "term": topic,
                    "definition": src["description"],
                    "source_url": src.get("url", ""),
                }
            )

    # Fill minimum content from top sources so tabs are never empty
    if len(affirmative) < 4:
        for src in all_sources:
            text = _text_from_source(src)
            if not text:
                continue
            sents = _sentences_from_source(src)
            for s in sents[:3]:
                if len(affirmative) >= 8:
                    break
                affirmative.append(
                    _make_block(f"Supporting evidence — {src.get('institution', 'Source')}", s, src)
                )

    if len(negative) < 4:
        neg_sources = [s for s in all_sources if CON_QUERY.search(s.get("title", "") + s.get("snippet", ""))]
        pool = neg_sources or all_sources[1:] or all_sources
        for src in pool:
            sents = _sentences_from_source(src)
            for s in sents[:3]:
                if len(negative) >= 8:
                    break
                negative.append(
                    _make_block(f"Counter-argument — {src.get('institution', 'Source')}", s, src)
                )

    for src in web_sources[:8]:
        text = _text_from_source(src)
        if not text:
            continue
        rebuttal_prep.append(
            {
                "anticipated_claim": src.get("title", "Opposing viewpoint"),
                "response_angle": text[:350],
                "source_url": src.get("url", ""),
                "institution": src.get("institution", "Web"),
            }
        )

    block_text = _compose_block_text(
        topic, overview, affirmative, negative, statistics, all_sources, definitions
    )

    return {
        "overview": overview,
        "affirmative": affirmative,
        "negative": negative,
        "key_statistics": statistics,
        "definitions": definitions,
        "rebuttal_prep": rebuttal_prep,
        "block_text": block_text,
    }


def _compose_block_text(
    topic: str,
    overview: str,
    affirmative: list[dict[str, Any]],
    negative: list[dict[str, Any]],
    statistics: list[dict[str, Any]],
    sources: list[dict[str, Any]],
    definitions: list[dict[str, Any]],
) -> str:
    lines = [
        f"DEBATE RESEARCH BLOCK — {topic.upper()}",
        "=" * 72,
        "",
        "OVERVIEW (Encyclopedias & Academic Sources)",
        "-" * 40,
        overview,
        "",
    ]

    if definitions:
        lines.append("DEFINITIONS")
        lines.append("-" * 40)
        for d in definitions:
            lines.append(f"• {d['term']}: {d['definition']}")
            if d.get("source_url"):
                lines.append(f"  Source: {d['source_url']}")
        lines.append("")

    if statistics:
        lines.append("KEY STATISTICS & DATA")
        lines.append("-" * 40)
        for s in statistics:
            lines.append(f"• {s['context']}")
            lines.append(f"  — {s.get('institution', 'Source')}: {s.get('source_url', '')}")
        lines.append("")

    lines.append("AFFIRMATIVE ARGUMENTS")
    lines.append("-" * 40)
    for i, b in enumerate(affirmative, 1):
        lines.append(f"{i}. {b['point']}")
        lines.append(f"   {b['evidence']}")
        lines.append(f"   Source ({b.get('institution', 'Web')}): {b['source_title']}")
        lines.append(f"   {b['source_url']}")
        lines.append("")

    lines.append("OPPOSITION / NEGATIVE ARGUMENTS")
    lines.append("-" * 40)
    for i, b in enumerate(negative, 1):
        lines.append(f"{i}. {b['point']}")
        lines.append(f"   {b['evidence']}")
        lines.append(f"   Source ({b.get('institution', 'Web')}): {b['source_title']}")
        lines.append(f"   {b['source_url']}")
        lines.append("")

    lines.append("SOURCE BIBLIOGRAPHY")
    lines.append("-" * 40)
    for i, src in enumerate(sources, 1):
        inst = src.get("institution", "Web")
        lines.append(f"[{i}] {inst} — {src.get('title', 'Untitled')}")
        lines.append(f"    {src.get('url', '')}")
        snippet = _text_from_source(src)
        if snippet:
            lines.append(f"    Excerpt: {snippet[:280]}…" if len(snippet) > 280 else f"    Excerpt: {snippet}")
        lines.append("")

    return "\n".join(lines)
