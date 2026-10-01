"""Wikipedia API helpers — works across all Wikipedia language editions."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import quote

import requests

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "DebateResearcher/1.0 (educational debate tool)"})

# Map langdetect codes to Wikipedia language codes where they differ.
LANG_MAP = {
    "zh-cn": "zh",
    "zh-tw": "zh",
    "he": "he",
    "nb": "no",
    "nn": "no",
}


def normalize_lang(code: str) -> str:
    code = (code or "en").lower().strip()
    return LANG_MAP.get(code, code.split("-")[0])


def search_wikipedia(query: str, lang: str = "en", limit: int = 5) -> list[dict[str, Any]]:
    """Return matching Wikipedia page titles and snippets."""
    lang = normalize_lang(lang)
    url = f"https://{lang}.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srlimit": limit,
        "format": "json",
        "utf8": 1,
    }
    try:
        resp = SESSION.get(url, params=params, timeout=12)
        resp.raise_for_status()
        return resp.json().get("query", {}).get("search", [])
    except requests.RequestException:
        return []


def get_page_summary(title: str, lang: str = "en") -> dict[str, Any] | None:
    """Fetch REST summary for a Wikipedia page."""
    lang = normalize_lang(lang)
    safe_title = quote(title.replace(" ", "_"), safe="/")
    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{safe_title}"
    try:
        resp = SESSION.get(url, timeout=12)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json()
        return {
            "title": data.get("title", title),
            "extract": data.get("extract", ""),
            "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
            "description": data.get("description", ""),
            "thumbnail": (data.get("thumbnail") or {}).get("source"),
        }
    except requests.RequestException:
        return None


def get_extended_extract(title: str, lang: str = "en", sentences: int = 8) -> str:
    """Pull a longer plain-text extract via the MediaWiki API."""
    lang = normalize_lang(lang)
    url = f"https://{lang}.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "prop": "extracts",
        "exintro": False,
        "explaintext": True,
        "exsentences": sentences,
        "titles": title,
        "format": "json",
        "utf8": 1,
    }
    try:
        resp = SESSION.get(url, params=params, timeout=12)
        resp.raise_for_status()
        pages = resp.json().get("query", {}).get("pages", {})
        for page in pages.values():
            return page.get("extract", "")
    except requests.RequestException:
        pass
    return ""


def split_into_sentences(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", text.strip())
    if not text:
        return []
    parts = re.split(r"(?<=[.!?。！？])\s+", text)
    return [p.strip() for p in parts if len(p.strip()) > 20]
