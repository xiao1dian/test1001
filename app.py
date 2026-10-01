#!/usr/bin/env python3
"""DebateResearcher — find sources and debate blocks for any topic."""

from __future__ import annotations

import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

from flask import Flask, jsonify, render_template, request, send_from_directory

from services.llm_helper import ai_status, enrich_feedback, is_llm_available
from services.research import research_topic
from services.speech_builder import generate_speech, get_formats
from services.speech_feedback import analyze_speech

app = Flask(__name__)

SITE_PORT = int(os.environ.get("PORT", 5050))


def _site_url() -> str:
    if os.environ.get("SITE_URL"):
        return os.environ["SITE_URL"]
    if os.environ.get("RENDER_EXTERNAL_URL"):
        return os.environ["RENDER_EXTERNAL_URL"]
    railway = os.environ.get("RAILWAY_PUBLIC_DOMAIN")
    if railway:
        return f"https://{railway}"
    host = os.environ.get("SITE_HOST", "debateresearcher.localhost")
    return f"http://{host}:{SITE_PORT}"


SITE_URL = _site_url()


@app.context_processor
def inject_site_url():
    return {"site_url": SITE_URL, "ai_enabled": is_llm_available()}


@app.route("/robots.txt")
def robots():
    body = f"""User-agent: *
Allow: /

Sitemap: {SITE_URL}/sitemap.xml
"""
    return body, 200, {"Content-Type": "text/plain"}


@app.route("/sitemap.xml")
def sitemap():
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>{SITE_URL}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>"""
    return xml, 200, {"Content-Type": "application/xml"}


@app.route("/")
def index():
    return render_template("index.html", site_url=SITE_URL)


@app.route("/api/ai-status")
def api_ai_status():
    return jsonify(ai_status())


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "app": "DebateResearcher", **ai_status()})


@app.route("/game")
def game():
    return render_template("game.html")


@app.route("/dino")
def dino():
    return render_template("dino.html")


@app.route("/api/formats", methods=["GET"])
def api_formats():
    return jsonify(get_formats())


@app.route("/api/speech", methods=["POST"])
def api_speech():
    data = request.get_json(silent=True) or {}
    topic = (data.get("topic") or "").strip()
    blocks = data.get("blocks") or {}
    debate_format = (data.get("format") or "pf").strip().lower()
    speech_type = (data.get("speech_type") or "constructive").strip().lower()
    side = (data.get("side") or "aff").strip().lower()

    if not topic:
        return jsonify({"error": "Topic is required."}), 400
    if not blocks:
        return jsonify({"error": "Run research first to generate a speech."}), 400

    try:
        result = generate_speech(topic, blocks, debate_format, speech_type, side)
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Speech generation failed: {exc}"}), 500


@app.route("/api/feedback", methods=["POST"])
def api_feedback():
    data = request.get_json(silent=True) or {}
    speech_text = (data.get("speech_text") or "").strip()
    topic = (data.get("topic") or "").strip()
    side = (data.get("side") or "aff").strip().lower()
    target_minutes = int(data.get("target_minutes") or 4)

    if not speech_text:
        return jsonify({"error": "Paste or generate a speech first."}), 400
    if len(speech_text) > 20000:
        return jsonify({"error": "Speech is too long (max 20,000 characters)."}), 400

    try:
        result = analyze_speech(speech_text, target_minutes, topic, side)
        ai_notes = enrich_feedback(speech_text, topic, target_minutes, result)
        if ai_notes:
            result["ai_coaching"] = ai_notes
        result["llm_available"] = is_llm_available()
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"Feedback failed: {exc}"}), 500


@app.route("/api/research", methods=["POST"])
def api_research():
    data = request.get_json(silent=True) or {}
    topic = (data.get("topic") or "").strip()
    language = (data.get("language") or "auto").strip().lower()

    if not topic:
        return jsonify({"error": "Please enter a debate topic."}), 400

    if len(topic) > 500:
        return jsonify({"error": "Topic is too long (max 500 characters)."}), 400

    try:
        result = research_topic(topic, language=None if language == "auto" else language)
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001 — surface friendly message to UI
        return jsonify({"error": f"Research failed: {exc}"}), 500


if __name__ == "__main__":
    port = SITE_PORT
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    print(f"\n  DebateResearcher → {SITE_URL}")
    print(f"  Also works at → http://127.0.0.1:{port}")
    if is_llm_available():
        print(f"  AI Coach: ON ({os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')}) — ChatGPT-quality speeches enabled")
    else:
        print("  AI Coach: OFF — copy .env.example to .env and add OPENAI_API_KEY")
    print()
    app.run(host="0.0.0.0", port=port, debug=debug)
