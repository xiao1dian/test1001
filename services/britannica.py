"""Britannica search and article extraction."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import quote, urljoin

import requests
from bs4 import BeautifulSoup

from services.content_fetcher import extract_paragraphs

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    }
)

BASE = "https://www.britannica.com"


def search_britannica(topic: str, limit: int = 4) -> list[dict[str, Any]]:
    url = f"{BASE}/search"
    try:
        resp = SESSION.get(url, params={"query": topic}, timeout=15)
        resp.raise_for_status()
    except requests.RequestException:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    results: list[dict[str, Any]] = []
    seen: set[str] = set()

    for a in soup.select("a[href]"):
        href = a.get("href", "")
        text = a.get_text(strip=True)
        if not text or len(text) < 8:
            continue
        if not ("/topic/" in href or "/procon/" in href or "/story/" in href):
            continue
        full_url = urljoin(BASE, href)
        if full_url in seen:
            continue
        seen.add(full_url)
        results.append(
            {
                "title": text,
                "url": full_url,
                "snippet": "",
                "type": "encyclopedia",
                "institution": "Britannica",
                "institution_type": "encyclopedia",
            }
        )
        if len(results) >= limit:
            break

    return results


def fetch_britannica_article(source: dict[str, Any]) -> dict[str, Any]:
    try:
        resp = SESSION.get(source["url"], timeout=15)
        if resp.status_code != 200:
            return source
        content = extract_paragraphs(resp.text, max_chars=5000)
        if content:
            source["content"] = content
            source["snippet"] = content[:500]
    except requests.RequestException:
        pass
    return source


def gather_britannica(topic: str) -> list[dict[str, Any]]:
    hits = search_britannica(topic, limit=4)
    enriched = []
    for hit in hits:
        enriched.append(fetch_britannica_article(hit))
    return enriched
