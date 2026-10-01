"""Gather sources from authoritative APIs — no blocked web scraping."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from services.authoritative import tag_source
from services.britannica import gather_britannica
from services.ddg_api import ddg_instant_answer
from services.openalex import UNIVERSITIES, search_openalex, search_university
from services.think_tanks import gather_think_tanks


def _priority(source: dict[str, Any]) -> tuple[int, int]:
    inst_type = source.get("institution_type", "web")
    order = {
        "encyclopedia": 0,
        "university": 1,
        "think_tank": 2,
        "research": 3,
        "academic": 4,
        "government": 5,
        "web": 6,
    }
    return (order.get(inst_type, 7), -len(source.get("content") or source.get("snippet") or ""))


def gather_all_sources(topic: str, core_topic: str, lang: str = "en") -> list[dict[str, Any]]:
    """
    Parallel fetch from Britannica, OpenAlex (Stanford/Harvard/Yale/Cornell),
    Brookings, Pew Research, and reference APIs.
    """
    combined: list[dict[str, Any]] = []
    seen: set[str] = set()

    def add_batch(batch: list[dict[str, Any]]) -> None:
        for hit in batch:
            url = hit.get("url", "")
            if not url or url in seen:
                continue
            seen.add(url)
            combined.append(tag_source(hit))

    tasks: list[tuple[str, Any]] = [
        ("britannica", lambda: gather_britannica(core_topic)),
        ("openalex", lambda: search_openalex(core_topic, per_page=8)),
        ("think_tanks", lambda: gather_think_tanks(topic, core_topic)),
        ("ddg", lambda: ddg_instant_answer(core_topic)),
    ]

    for uni_name, inst_id in UNIVERSITIES.items():
        tasks.append(
            (uni_name, lambda n=uni_name, i=inst_id: search_university(core_topic, n, i, per_page=3))
        )

    # Also search with full debate topic for think tanks
    tasks.append(("openalex_topic", lambda: search_openalex(topic, per_page=4)))

    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(fn): name for name, fn in tasks}
        for fut in as_completed(futures):
            try:
                add_batch(fut.result())
            except Exception:
                continue

    combined.sort(key=_priority)
    return combined
