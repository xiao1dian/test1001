"""Optional OpenAI enhancement — real sources + ChatGPT-quality speeches."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import requests

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:
    pass

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
DEFAULT_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

SPEECH_INSTRUCTIONS = {
    "constructive": (
        "Write a full constructive: greeting, resolution, clear numbered contentions with evidence, "
        "impact analysis, and a closing with cross-ex invitation if appropriate."
    ),
    "rebuttal": (
        "Write a rebuttal: extend your case, answer opponent attacks, add offense, "
        "weigh impacts (magnitude/probability/timeframe), close strongly."
    ),
    "summary": (
        "Write a summary: collapse to your strongest argument, weigh against opponent, "
        "tell the judge exactly why to vote for you."
    ),
    "final": (
        "Write a final focus / reply: one clear voting issue, no new arguments, "
        "crystallize why your side wins."
    ),
}

FORMAT_NOTES = {
    "ld": "Include value and criterion in constructive. Use contention structure with link/warrant/impact.",
    "pf": "Public Forum tone — accessible, policy-focused, two contentions minimum in constructive.",
    "parli": "Parliamentary — define the motion, government/opposition framing, substantive points.",
    "policy": "Policy/CX — plan/advocacy or negative strategy with advantages/disadvantages.",
    "worlds": "World Schools — comparative weighing, international examples welcome if in sources.",
}


def is_llm_available() -> bool:
    return bool(os.environ.get("OPENAI_API_KEY"))


def ai_status() -> dict[str, Any]:
    return {
        "available": is_llm_available(),
        "model": DEFAULT_MODEL if is_llm_available() else None,
        "provider": "openai" if is_llm_available() else None,
    }


def chat(system: str, user: str, max_tokens: int = 2500, temperature: float = 0.7) -> str | None:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        return None
    try:
        resp = requests.post(
            OPENAI_URL,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": DEFAULT_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
            timeout=90,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except (requests.RequestException, KeyError, IndexError):
        return None


def _format_research_pack(blocks: dict[str, Any], side: str) -> str:
    lines: list[str] = []
    overview = (blocks.get("overview") or "")[:1200]
    if overview:
        lines.append("OVERVIEW")
        lines.append(overview)
        lines.append("")

    args = blocks.get("affirmative" if side == "aff" else "negative", [])[:8]
    lines.append("ARGUMENTS FOR YOUR SIDE (use these — do not invent others)")
    for i, arg in enumerate(args, 1):
        lines.append(f"{i}. Claim: {arg.get('point', '')}")
        lines.append(f"   Evidence: {arg.get('evidence', '')[:450]}")
        lines.append(f"   Cite: {arg.get('institution', 'Source')} — {arg.get('source_url', '')}")
        lines.append("")

    stats = blocks.get("key_statistics", [])[:5]
    if stats:
        lines.append("KEY STATISTICS")
        for s in stats:
            lines.append(f"- {s.get('context', s.get('stat', ''))}")
            lines.append(f"  ({s.get('institution', 'Source')}) {s.get('source_url', '')}")
        lines.append("")

    prep = blocks.get("rebuttal_prep", [])[:3]
    if prep:
        lines.append("OPPONENT POINTS TO ANSWER (for rebuttals)")
        for p in prep:
            lines.append(f"- They may argue: {p.get('anticipated_claim', '')[:120]}")
            lines.append(f"  Response angle: {p.get('response_angle', '')[:200]}")
        lines.append("")

    return "\n".join(lines)


def generate_ai_speech(
    topic: str,
    blocks: dict[str, Any],
    format_name: str,
    speech_label: str,
    side: str,
    target_minutes: int,
    speech_kind: str = "constructive",
    debate_format: str = "pf",
) -> tuple[str | None, bool]:
    """Write a full speech from research blocks using OpenAI. Returns (text, success)."""
    if not is_llm_available():
        return None, False

    side_label = "Affirmative / Pro" if side == "aff" else "Negative / Con"
    target_words = target_minutes * 150
    kind_note = SPEECH_INSTRUCTIONS.get(speech_kind, SPEECH_INSTRUCTIONS["constructive"])
    format_note = FORMAT_NOTES.get(debate_format, "")

    system = (
        "You are an elite competitive debate coach and speechwriter. "
        "Write a speech that sounds natural when spoken aloud — confident, clear, persuasive. "
        "CRITICAL RULES:\n"
        "1. Use ONLY facts and evidence from the RESEARCH PACK below.\n"
        "2. Include source URLs when citing evidence (keep URLs exact).\n"
        "3. Do NOT invent statistics, studies, authors, or URLs.\n"
        "4. If evidence is thin, say so honestly rather than fabricating.\n"
        "5. Match the debate format and speech type exactly.\n"
        "6. No bracket labels like [OPENING] — write flowing spoken prose.\n"
        f"7. Target ~{target_words} words ({target_minutes} min at ~150 wpm)."
    )

    user = (
        f"TOPIC: {topic}\n"
        f"FORMAT: {format_name} ({format_note})\n"
        f"SPEECH TYPE: {speech_label}\n"
        f"SIDE: {side_label}\n"
        f"STRUCTURE: {kind_note}\n\n"
        f"RESEARCH PACK:\n{_format_research_pack(blocks, side)}\n\n"
        "Write the complete speech now, ready to read in round."
    )

    result = chat(system, user, max_tokens=3500, temperature=0.72)
    if result and len(result.split()) >= 80:
        return result, True
    return None, False


def polish_speech(
    draft: str,
    topic: str,
    format_name: str,
    speech_label: str,
    side: str,
    target_minutes: int,
) -> tuple[str, bool]:
    """Return (polished_text, used_llm). Fallback when full AI generation fails."""
    system = (
        "You are an expert debate coach. Rewrite the draft into a smooth, persuasive speech "
        "that sounds natural when spoken aloud — like a real student competitor, not a robot. "
        "Keep ALL citations and source URLs exactly as written. Do not invent facts. "
        "Use short clear sentences, varied transitions, and distinct contentions. "
        "Never repeat the same impact phrase twice. "
        f"Target length: about {target_minutes * 150} words ({target_minutes} minutes at debate pace)."
    )
    user = (
        f"Topic: {topic}\nFormat: {format_name}\nSpeech: {speech_label}\nSide: {side}\n\n"
        f"Draft to polish:\n\n{draft}"
    )
    result = chat(system, user, max_tokens=3000, temperature=0.65)
    if result:
        return result, True
    return draft, False


def enrich_feedback(
    speech: str,
    topic: str,
    target_minutes: int,
    rule_feedback: dict[str, Any],
) -> dict[str, Any] | None:
    """Add AI coaching notes when API key is available."""
    system = (
        "You are a competitive debate coach like a skilled human judge. "
        "Return JSON-only with keys: coaching_summary (2 sentences), top_3_improvements (array of strings), "
        "delivery_tips (array of strings). Be specific and constructive. Do not invent facts about the topic."
    )
    user = (
        f"Topic: {topic}\nTarget time: {target_minutes} min\n"
        f"Baseline score: {rule_feedback.get('score')}\n"
        f"Baseline notes: {rule_feedback.get('improvements')}\n\nSpeech:\n{speech[:4000]}"
    )
    raw = chat(system, user, max_tokens=800, temperature=0.5)
    if not raw:
        return None
    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0]
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"coaching_summary": raw, "top_3_improvements": [], "delivery_tips": []}
