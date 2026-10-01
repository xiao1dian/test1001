"""Main research orchestration — deep gather from authoritative sources."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from langdetect import LangDetectException, detect

from services.authoritative import tag_source
from services.content_fetcher import enrich_source
from services.debate_blocks import build_blocks
from services.search import gather_all_sources
from services.topic_utils import english_search_terms, extract_core_topic, is_relevant, topic_keywords
from services.wikipedia import (
    get_extended_extract,
    get_page_summary,
    search_wikipedia,
)


def _script_hint(text: str) -> str | None:
    counts = {"zh": 0, "ja": 0, "ko": 0, "ar": 0, "hi": 0, "ru": 0}
    for ch in text:
        cp = ord(ch)
        if 0x3040 <= cp <= 0x30FF or 0x31F0 <= cp <= 0x31FF:
            counts["ja"] += 2
        if 0xAC00 <= cp <= 0xD7AF:
            counts["ko"] += 2
        if 0x4E00 <= cp <= 0x9FFF or 0x3400 <= cp <= 0x4DBF:
            counts["zh"] += 1
        if 0x0600 <= cp <= 0x06FF:
            counts["ar"] += 1
        if 0x0900 <= cp <= 0x097F:
            counts["hi"] += 1
        if 0x0400 <= cp <= 0x04FF:
            counts["ru"] += 1
    ranked = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    if ranked[0][1] >= 3:
        return ranked[0][0]
    return None


def detect_language(text: str) -> str:
    hint = _script_hint(text)
    if hint:
        return hint
    try:
        return detect(text)
    except LangDetectException:
        return "en"


def _search_langs(primary: str) -> list[str]:
    langs = [primary, "en"]
    seen: set[str] = set()
    ordered: list[str] = []
    for lang in langs:
        if lang not in seen:
            seen.add(lang)
            ordered.append(lang)
    return ordered


def _gather_wikipedia(topic: str, core: str, lang: str) -> tuple[list[dict[str, Any]], str]:
    wiki_sources: list[dict[str, Any]] = []
    lang_used = lang

    for candidate in _search_langs(lang):
        seen_titles: set[str] = set()
        for query in (core, topic):
            hits = search_wikipedia(query, lang=candidate, limit=5)
            for hit in hits[:4]:
                title = hit["title"]
                if title in seen_titles:
                    continue
                seen_titles.add(title)
                summary = get_page_summary(title, lang=candidate)
                if not summary or not summary.get("url"):
                    continue
                extract = get_extended_extract(title, lang=candidate, sentences=40)
                content = extract or summary.get("extract", "")
                entry = tag_source(
                    {
                        "title": summary["title"],
                        "url": summary.get("url", ""),
                        "snippet": summary.get("extract", "")[:600],
                        "content": content,
                        "description": summary.get("description", ""),
                        "type": "wikipedia",
                        "institution": "Wikipedia",
                        "institution_type": "encyclopedia",
                    }
                )
                wiki_sources.append(entry)
            if wiki_sources:
                lang_used = candidate
                break
        if wiki_sources:
            break

    return wiki_sources, lang_used


def _enrich_sources(sources: list[dict[str, Any]], max_workers: int = 8) -> list[dict[str, Any]]:
    """Fetch page content for sources that only have short snippets."""
    to_fetch = [s for s in sources if len(s.get("content") or "") < 400]
    already_rich = [s for s in sources if len(s.get("content") or "") >= 400]

    enriched_map: dict[str, dict[str, Any]] = {s["url"]: s for s in already_rich}

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(enrich_source, src): src for src in to_fetch}
        for fut in as_completed(futures):
            src = futures[fut]
            try:
                enriched_map[src["url"]] = fut.result()
            except Exception:
                enriched_map[src["url"]] = src

    return [enriched_map[s["url"]] for s in sources if s["url"] in enriched_map]


def research_topic(topic: str, language: str | None = None) -> dict[str, Any]:
    topic = topic.strip()
    if not topic:
        raise ValueError("Topic cannot be empty")

    lang = (language or detect_language(topic)).lower()
    if lang == "auto":
        lang = detect_language(topic)

    core = extract_core_topic(topic)
    search_terms = english_search_terms(topic, core)
    english_core = search_terms[0]

    wiki_sources, lang_used = _gather_wikipedia(topic, core, lang)
    web_sources = gather_all_sources(topic, english_core, lang=lang_used)

    all_sources: list[dict[str, Any]] = []
    seen: set[str] = set()
    for src in wiki_sources + web_sources:
        url = src.get("url", "")
        if url and url not in seen:
            seen.add(url)
            all_sources.append(src)

    all_sources = _enrich_sources(all_sources)

    # Drop sources that don't mention the topic (except major encyclopedias).
    keywords = topic_keywords(topic, core)
    filtered: list[dict[str, Any]] = []
    for src in all_sources:
        inst = src.get("institution", "")
        if inst in ("Wikipedia", "Britannica") or src.get("institution_type") == "encyclopedia":
            filtered.append(src)
        elif is_relevant(src, keywords, core=core, min_matches=1):
            filtered.append(src)
    all_sources = filtered or all_sources  # keep all if filter too aggressive

    wiki_final = [s for s in all_sources if s.get("institution") == "Wikipedia"]
    web_final = [s for s in all_sources if s not in wiki_final]

    blocks = build_blocks(topic, wiki_final, web_final)

    institutions_found = sorted(
        {s.get("institution") for s in all_sources if s.get("institution") and s.get("institution") not in ("Web", "Reference", "DuckDuckGo Reference")}
    )

    return {
        "topic": topic,
        "core_topic": core,
        "language": lang_used,
        "source_count": len(all_sources),
        "institutions": institutions_found,
        "sources": all_sources,
        "blocks": blocks,
    }
