"""Fetch and extract readable text from source pages."""

from __future__ import annotations

import re
from typing import Any

import requests
from bs4 import BeautifulSoup

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    }
)

SKIP_TAGS = {"script", "style", "nav", "footer", "header", "aside", "form", "noscript"}
CONTENT_SELECTORS = [
    "article",
    "main",
    '[role="main"]',
    ".article-body",
    ".article-content",
    ".entry-content",
    ".post-content",
    ".content",
    "#content",
    ".mw-parser-output",  # Wikipedia
    ".topic-content",     # Britannica
]


def _clean_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_paragraphs(html: str, max_chars: int = 4000) -> str:
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup.find_all(SKIP_TAGS):
        tag.decompose()

    chunks: list[str] = []

    for selector in CONTENT_SELECTORS:
        for node in soup.select(selector):
            for p in node.find_all(["p", "li", "h2", "h3"]):
                txt = _clean_text(p.get_text(" ", strip=True))
                if len(txt) > 40:
                    chunks.append(txt)
        if chunks:
            break

    if not chunks:
        for p in soup.find_all("p"):
            txt = _clean_text(p.get_text(" ", strip=True))
            if len(txt) > 60:
                chunks.append(txt)

    combined = " ".join(chunks)
    if len(combined) > max_chars:
        combined = combined[:max_chars].rsplit(" ", 1)[0] + "…"
    return combined


def enrich_source(source: dict[str, Any], max_chars: int = 3500) -> dict[str, Any]:
    """Try to pull full page excerpt; keep existing snippet on failure."""
    url = source.get("url", "")
    if not url.startswith("http"):
        return source

    # Wikipedia handled separately with API — skip HTML scrape.
    if "wikipedia.org" in url:
        return source

    try:
        resp = SESSION.get(url, timeout=10, allow_redirects=True)
        if resp.status_code != 200:
            return source
        content_type = resp.headers.get("Content-Type", "")
        if "text/html" not in content_type and "application/xhtml" not in content_type:
            return source
        extracted = extract_paragraphs(resp.text, max_chars=max_chars)
        if len(extracted) > len(source.get("snippet", "")):
            source["content"] = extracted
            source["snippet"] = extracted[:500] + ("…" if len(extracted) > 500 else "")
    except requests.RequestException:
        pass

    return source
