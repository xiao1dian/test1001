"""Think tank and research institute content via public APIs."""

from __future__ import annotations

from typing import Any

import requests

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "DebateResearcher/1.0"})

THINK_TANKS = [
    {
        "name": "Pew Research Center",
        "domain": "pewresearch.org",
        "api": "https://www.pewresearch.org/wp-json/wp/v2/posts",
        "type": "research",
    },
    {
        "name": "Brookings Institution",
        "domain": "brookings.edu",
        "api": "https://www.brookings.edu/wp-json/wp/v2/posts",
        "type": "think_tank",
    },
]


def _strip_html(text: str) -> str:
    import re
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def search_think_tank(api_url: str, topic: str, name: str, inst_type: str, limit: int = 4) -> list[dict[str, Any]]:
    try:
        resp = SESSION.get(
            api_url,
            params={"search": topic, "per_page": limit, "_fields": "title,link,excerpt,content"},
            timeout=15,
        )
        if resp.status_code != 200:
            return []
        posts = resp.json()
        if not isinstance(posts, list):
            return []
    except requests.RequestException:
        return []

    sources: list[dict[str, Any]] = []
    for post in posts:
        title_obj = post.get("title", {})
        title = title_obj.get("rendered", "") if isinstance(title_obj, dict) else str(title_obj)
        link = post.get("link", "")
        excerpt = _strip_html(post.get("excerpt", {}).get("rendered", ""))
        content = _strip_html(post.get("content", {}).get("rendered", ""))
        if not link:
            continue
        sources.append(
            {
                "title": title,
                "url": link,
                "snippet": excerpt[:500] or content[:500],
                "content": content[:4000] if content else excerpt,
                "type": inst_type,
                "institution": name,
                "institution_type": inst_type,
            }
        )
    return sources


def gather_think_tanks(topic: str, core_topic: str) -> list[dict[str, Any]]:
    combined: list[dict[str, Any]] = []
    seen: set[str] = set()

    for tank in THINK_TANKS:
        for query in (core_topic, topic):
            for hit in search_think_tank(tank["api"], query, tank["name"], tank["type"]):
                if hit["url"] not in seen:
                    seen.add(hit["url"])
                    combined.append(hit)
            if combined:
                break

    return combined
