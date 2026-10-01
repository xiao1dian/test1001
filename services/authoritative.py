"""Authoritative academic and encyclopedic sources for debate research."""

from __future__ import annotations

from typing import Any

# Institutions we actively search via site: queries.
AUTHORITATIVE_SOURCES: list[dict[str, str]] = [
    {"name": "Wikipedia", "domain": "wikipedia.org", "type": "encyclopedia"},
    {"name": "Britannica", "domain": "britannica.com", "type": "encyclopedia"},
    {"name": "Encyclopedia.com", "domain": "encyclopedia.com", "type": "encyclopedia"},
    {"name": "Stanford Encyclopedia of Philosophy", "domain": "plato.stanford.edu", "type": "encyclopedia"},
    {"name": "Stanford University", "domain": "stanford.edu", "type": "university"},
    {"name": "Harvard University", "domain": "harvard.edu", "type": "university"},
    {"name": "Yale University", "domain": "yale.edu", "type": "university"},
    {"name": "Cornell University", "domain": "cornell.edu", "type": "university"},
    {"name": "Brookings Institution", "domain": "brookings.edu", "type": "think_tank"},
    {"name": "Pew Research Center", "domain": "pewresearch.org", "type": "research"},
    {"name": "NIH", "domain": "nih.gov", "type": "government"},
    {"name": "CDC", "domain": "cdc.gov", "type": "government"},
    {"name": "Nature", "domain": "nature.com", "type": "journal"},
    {"name": "ScienceDirect", "domain": "sciencedirect.com", "type": "journal"},
]

DOMAIN_TO_INSTITUTION: dict[str, dict[str, str]] = {
    src["domain"]: src for src in AUTHORITATIVE_SOURCES
}


def institution_for_url(url: str) -> dict[str, str] | None:
    url_lower = url.lower()
    for domain, info in DOMAIN_TO_INSTITUTION.items():
        if domain in url_lower:
            return info
    return None


def tag_source(source: dict[str, Any]) -> dict[str, Any]:
    """Attach institution metadata when the URL matches a known authority."""
    info = institution_for_url(source.get("url", ""))
    if info:
        source["institution"] = info["name"]
        source["institution_type"] = info["type"]
    else:
        source.setdefault("institution", "Web")
        source.setdefault("institution_type", "web")
    return source
