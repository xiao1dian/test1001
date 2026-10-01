"""DuckDuckGo Instant Answer API — fallback abstract & related topics."""

from __future__ import annotations

from typing import Any

import requests

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "DebateResearcher/1.0"})


def ddg_instant_answer(topic: str) -> list[dict[str, Any]]:
    try:
        resp = SESSION.get(
            "https://api.duckduckgo.com/",
            params={"q": topic, "format": "json", "no_html": 1, "skip_disambig": 1},
            timeout=12,
        )
        data = resp.json()
    except (requests.RequestException, ValueError):
        return []

    sources: list[dict[str, Any]] = []

    abstract = data.get("AbstractText", "")
    abstract_url = data.get("AbstractURL", "")
    heading = data.get("Heading", topic)
    if abstract and abstract_url:
        sources.append(
            {
                "title": heading,
                "url": abstract_url,
                "snippet": abstract[:500],
                "content": abstract,
                "type": "encyclopedia",
                "institution": data.get("AbstractSource", "Reference"),
                "institution_type": "encyclopedia",
            }
        )

    for item in data.get("RelatedTopics") or []:
        if isinstance(item, dict) and "Text" in item and "FirstURL" in item:
            sources.append(
                {
                    "title": item["Text"].split(" - ")[0][:120],
                    "url": item["FirstURL"],
                    "snippet": item["Text"],
                    "content": item["Text"],
                    "type": "reference",
                    "institution": "DuckDuckGo Reference",
                    "institution_type": "encyclopedia",
                }
            )
        elif isinstance(item, dict) and "Topics" in item:
            for sub in item["Topics"][:3]:
                if "Text" in sub and "FirstURL" in sub:
                    sources.append(
                        {
                            "title": sub["Text"].split(" - ")[0][:120],
                            "url": sub["FirstURL"],
                            "snippet": sub["Text"],
                            "content": sub["Text"],
                            "type": "reference",
                            "institution": "Reference",
                            "institution_type": "encyclopedia",
                        }
                    )

    return sources[:8]
