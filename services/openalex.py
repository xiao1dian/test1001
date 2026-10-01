"""OpenAlex API — academic papers from Stanford, Harvard, Yale, Cornell & more."""

from __future__ import annotations

from typing import Any

import requests

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "DebateResearcher/1.0 (mailto:research@example.com)"})

OPENALEX = "https://api.openalex.org/works"

# OpenAlex institution IDs for targeted university searches.
UNIVERSITIES: dict[str, str] = {
    "Stanford University": "I97018004",
    "Harvard University": "I136199984",
    "Yale University": "I98358890",
    "Cornell University": "I205783295",
}

INSTitution_LOOKUP = {v: k for k, v in UNIVERSITIES.items()}


def _reconstruct_abstract(inverted: dict[str, list[int]] | None) -> str:
    if not inverted:
        return ""
    max_pos = max(max(positions) for positions in inverted.values())
    words: list[str | None] = [None] * (max_pos + 1)
    for word, positions in inverted.items():
        for pos in positions:
            words[pos] = word
    return " ".join(w for w in words if w)


def _work_to_source(work: dict[str, Any], institution: str) -> dict[str, Any]:
    abstract = _reconstruct_abstract(work.get("abstract_inverted_index"))
    raw_url = work.get("doi") or work.get("id") or ""
    if raw_url.startswith("http"):
        url = raw_url
    elif raw_url.startswith("10."):
        url = f"https://doi.org/{raw_url}"
    else:
        url = raw_url

    year = work.get("publication_year")
    title = work.get("title") or "Untitled paper"
    if year:
        title = f"{title} ({year})"

    content_parts = [abstract]
    if work.get("concepts"):
        concepts = ", ".join(c.get("display_name", "") for c in work["concepts"][:5] if c.get("display_name"))
        if concepts:
            content_parts.append(f"Key concepts: {concepts}")

    content = " ".join(p for p in content_parts if p).strip()

    return {
        "title": title,
        "url": url,
        "snippet": abstract[:500] if abstract else title,
        "content": content,
        "type": "academic",
        "institution": institution,
        "institution_type": "university",
    }


def _primary_institution(work: dict[str, Any]) -> str:
    for auth in work.get("authorships") or []:
        for inst in auth.get("institutions") or []:
            inst_id = inst.get("id", "").rsplit("/", 1)[-1]
            if inst_id in INSTITUTION_LOOKUP:
                return INSTITUTION_LOOKUP[inst_id]
            name = inst.get("display_name", "")
            for uni in UNIVERSITIES:
                if uni.split()[0] in name:
                    return uni
    return "Academic Research"


def search_openalex(topic: str, per_page: int = 5) -> list[dict[str, Any]]:
    """General academic paper search."""
    try:
        resp = SESSION.get(
            OPENALEX,
            params={"search": topic, "per_page": per_page},
            timeout=20,
        )
        resp.raise_for_status()
        works = resp.json().get("results", [])
    except requests.RequestException:
        return []

    sources = []
    for work in works:
        inst = _primary_institution(work)
        sources.append(_work_to_source(work, inst))
    return sources


def search_university(topic: str, uni_name: str, inst_id: str, per_page: int = 3) -> list[dict[str, Any]]:
    """Papers from a specific university via OpenAlex institution filter."""
    try:
        resp = SESSION.get(
            OPENALEX,
            params={
                "search": topic,
                "filter": f"authorships.institutions.id:{inst_id}",
                "per_page": per_page,
            },
            timeout=20,
        )
        resp.raise_for_status()
        works = resp.json().get("results", [])
    except requests.RequestException:
        return []

    return [_work_to_source(w, uni_name) for w in works]
