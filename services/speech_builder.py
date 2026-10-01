"""Format-specific full speech generation from research blocks."""

from __future__ import annotations

from typing import Any

from services.llm_helper import generate_ai_speech, is_llm_available, polish_speech
from services.smooth_speech import build_smooth_speech, detect_speech_kind

DEBATE_FORMATS: dict[str, dict[str, Any]] = {
    "ld": {
        "name": "Lincoln-Douglas",
        "speeches": {
            "aff_constructive": {"label": "Affirmative Constructive", "side": "aff", "minutes": 6},
            "neg_constructive": {"label": "Negative Constructive", "side": "neg", "minutes": 7},
            "aff_rebuttal_1": {"label": "1st Affirmative Rebuttal", "side": "aff", "minutes": 4},
            "neg_rebuttal": {"label": "Negative Rebuttal", "side": "neg", "minutes": 6},
            "aff_rebuttal_2": {"label": "2nd Affirmative Rebuttal", "side": "aff", "minutes": 3},
        },
    },
    "pf": {
        "name": "Public Forum",
        "speeches": {
            "constructive": {"label": "Team Constructive", "side": "both", "minutes": 4},
            "rebuttal": {"label": "Team Rebuttal", "side": "both", "minutes": 4},
            "summary": {"label": "Summary Speech", "side": "both", "minutes": 3},
            "final_focus": {"label": "Final Focus", "side": "both", "minutes": 2},
        },
    },
    "parli": {
        "name": "Parliamentary",
        "speeches": {
            "pm_constructive": {"label": "Prime Minister Constructive", "side": "aff", "minutes": 7},
            "lo_constructive": {"label": "Leader of Opposition", "side": "neg", "minutes": 8},
            "mg_speech": {"label": "Member of Government", "side": "aff", "minutes": 8},
            "mo_speech": {"label": "Member of Opposition", "side": "neg", "minutes": 8},
            "gwhip": {"label": "Government Whip", "side": "aff", "minutes": 4},
            "owhip": {"label": "Opposition Whip", "side": "neg", "minutes": 6},
            "reply": {"label": "Opposition Reply / Summary", "side": "neg", "minutes": 4},
        },
    },
    "policy": {
        "name": "Policy / CX",
        "speeches": {
            "1ac": {"label": "1st Affirmative Constructive (1AC)", "side": "aff", "minutes": 8},
            "1nc": {"label": "1st Negative Constructive (1NC)", "side": "neg", "minutes": 8},
            "2ac": {"label": "2nd Affirmative Constructive (2AC)", "side": "aff", "minutes": 8},
            "2nc": {"label": "2nd Negative Constructive (2NC)", "side": "neg", "minutes": 8},
            "1ar": {"label": "1st Affirmative Rebuttal (1AR)", "side": "aff", "minutes": 5},
            "2nr": {"label": "2nd Negative Rebuttal (2NR)", "side": "neg", "minutes": 5},
        },
    },
    "worlds": {
        "name": "World Schools",
        "speeches": {
            "constructive": {"label": "Constructive Speech", "side": "both", "minutes": 8},
            "rebuttal": {"label": "Rebuttal Speech", "side": "both", "minutes": 8},
            "summary": {"label": "Summary Speech", "side": "both", "minutes": 4},
            "reply": {"label": "Reply Speech", "side": "both", "minutes": 4},
        },
    },
}


def get_formats() -> dict[str, Any]:
    return {
        fid: {"id": fid, "name": info["name"], "speeches": info["speeches"]}
        for fid, info in DEBATE_FORMATS.items()
    }


def _cite(arg: dict[str, Any]) -> str:
    inst = arg.get("institution", "Source")
    title = arg.get("source_title", "")
    url = arg.get("source_url", "")
    if url:
        return f"({inst}, {title}, {url})"
    return f"({inst}, {title})"


def _points(args: list[dict[str, Any]], n: int = 5) -> list[dict[str, Any]]:
    return args[:n] if args else []


def _overview_snip(blocks: dict[str, Any], max_len: int = 400) -> str:
    ov = blocks.get("overview", "")
    if len(ov) <= max_len:
        return ov
    return ov[:max_len].rsplit(" ", 1)[0] + "…"


def _stat_lines(blocks: dict[str, Any], n: int = 3) -> list[str]:
    lines = []
    for s in blocks.get("key_statistics", [])[:n]:
        lines.append(f"{s.get('context', s.get('stat', ''))} {_cite(s)}")
    return lines


def _build_contention(num: int, arg: dict[str, Any], stats: list[str]) -> str:
    lines = [
        f"Contention {num}: {arg.get('point', 'Key argument')}",
        "",
        "Link:",
        arg.get("evidence", ""),
        "",
        "Warrant:",
        f"This matters because it directly impacts the resolution. The evidence establishes a clear causal link.",
        "",
        "Impact:",
        f"If this contention is true, the {'affirmative' if num % 2 == 1 else 'negative'} position is strongly supported.",
        _cite(arg),
    ]
    if stats and num <= len(stats):
        lines.extend(["", "Supporting data:", stats[num - 1]])
    return "\n".join(lines)


def _ld_aff_constructive(topic: str, blocks: dict[str, Any], side_args: list[dict[str, Any]]) -> str:
    args = _points(side_args, 4)
    stats = _stat_lines(blocks, 4)
    contentions = "\n\n".join(_build_contention(i + 1, a, stats) for i, a in enumerate(args))

    extra_stats = "\n".join(f"- {s}" for s in stats) if stats else ""

    return f"""LD AFFIRMATIVE CONSTRUCTIVE — {topic}
Time: 6 minutes | Format: Lincoln-Douglas

[OPENING]
Resolved: {topic}. I affirm. Before I begin, I'd like to establish my framework for evaluating this resolution.

[FRAMEWORK]
Value: Societal Welfare / Justice
Criterion: Maximizing net benefits for society while protecting fundamental rights

The resolution asks us to evaluate whether the affirmative position best serves society. My criterion provides a clear weighing mechanism: we adopt the position that produces the greatest overall benefit while respecting human dignity. Any argument that claims to help society must be weighed against this standard.

[OVERVIEW]
{_overview_snip(blocks, 500)}

[KEY DATA]
{extra_stats}

[CONTENTIONS]
{contentions or "Contention 1: The affirmative position is supported by the preponderance of evidence. See research blocks for full citations."}

[IMPACT ANALYSIS]
Each contention independently supports the affirmative. Even if you disagree with one link, the cumulative impact of {len(args)} independent arguments demonstrates that the resolution should be affirmed. The evidence from sources including Wikipedia, Britannica, and leading universities establishes a clear affirmative burden that has been met.

Layered impacts mean the judge can vote affirmative on any single contention extended in rebuttal. Magnitude, probability, and timeframe all favor the affirmative side.

[CONCLUSION]
For these reasons — framework, contentions, and impact — I affirm. I now stand open for cross-examination."""


def _ld_neg_constructive(topic: str, blocks: dict[str, Any], side_args: list[dict[str, Any]]) -> str:
    args = _points(side_args, 3)
    stats = _stat_lines(blocks)
    contentions = "\n\n".join(_build_contention(i + 1, a, stats) for i, a in enumerate(args))

    return f"""LD NEGATIVE CONSTRUCTIVE — {topic}
Time: 7 minutes | Format: Lincoln-Douglas

[OPENING]
Resolved: {topic}. I negate. I accept the affirmative's value but offer a superior framework.

[FRAMEWORK]
Value: Justice / Prudence
Criterion: Minimizing harm and avoiding unintended consequences

The negative does not dispute that the goal is a better society — we dispute that the 
affirmative's approach achieves it. Prudence requires us to reject policies with 
unacceptable risks and insufficient evidence of success.

[OVERVIEW OF OPPOSITION CASE]
{_overview_snip(blocks, 350)}

[CONTENTIONS]
{contentions}

[IMPACT ANALYSIS]
The affirmative bears the burden of proof. Even under their framework, the risks and 
costs outlined in my contentions outweigh claimed benefits. The preponderance of 
evidence from academic and policy sources supports a negative ballot.

[CONCLUSION]
The resolution fails on impact comparison. I negate. Cross-examination."""


def _ld_rebuttal(topic: str, blocks: dict[str, Any], side_args: list[dict[str, Any]], side: str, speech_num: int) -> str:
    opp_label = "negative" if side == "aff" else "affirmative"
    own = side_args[:4]
    prep = blocks.get("rebuttal_prep", [])[:3]

    defense = "\n".join(
        f"- Extend Contention {i+1}: {a.get('point','')} — {a.get('evidence','')[:200]} {_cite(a)}"
        for i, a in enumerate(own)
    )

    attacks = "\n".join(
        f"- Attack on {opp_label}: {p.get('anticipated_claim','')} → Response: {p.get('response_angle','')[:250]}"
        for p in prep
    )

    time_map = {1: 4, 2: 3}
    minutes = time_map.get(speech_num, 4)

    return f"""LD {'AFFIRMATIVE' if side == 'aff' else 'NEGATIVE'} REBUTTAL #{speech_num} — {topic}
Time: {minutes} minutes | Format: Lincoln-Douglas

[LINE-BY-LINE / COLLAPSE]
First, extend your framework — it still provides the best weighing mechanism in this round.

[DEFENSE — EXTEND YOUR CASE]
{defense or "Extend all uncontested contentions from constructive."}

[OFFENSE — TURN / ATTACK OPPONENT]
{attacks or f"Challenge the {opp_label}'s central link chain. Their evidence does not establish causation."}

[WEIGHING]
Even if the {opp_label} wins some peripheral points, your impacts outweigh because:
1. Magnitude — your arguments affect more people / deeper rights
2. Probability — your evidence is from peer-reviewed and institutional sources
3. Timeframe — your benefits materialize sooner or prevent irreversible harm

[VOTERS]
Vote {'Affirmative' if side == 'aff' else 'Negative'} if you believe:
- {own[0].get('point', 'Primary contention') if own else 'Primary contention'} is true
- The framework favors {'affirmation' if side == 'aff' else 'negation'}

[CONCLUSION]
For these reasons, {'affirm' if side == 'aff' else 'negate'}."""


def _pf_constructive(topic: str, blocks: dict[str, Any], side_args: list[dict[str, Any]], side: str) -> str:
    args = _points(side_args, 4)
    stats = _stat_lines(blocks, 4)
    side_label = "PRO" if side == "aff" else "CON"
    contentions = "\n\n".join(
        f"Contention {i+1}: {a.get('point','')}\n\nLink & Evidence:\n{a.get('evidence','')}\n\nImpact: This argument alone justifies a {side_label} ballot.\n{_cite(a)}"
        for i, a in enumerate(args)
    )
    stat_block = "\n".join(f"• {s}" for s in stats)

    return f"""PUBLIC FORUM {side_label} CONSTRUCTIVE — {topic}
Time: 4 minutes | Format: Public Forum

[INTRODUCTION]
We are debating: {topic}. As the {side_label} side, we clearly win this round. My partner and I will present {len(args)} independent contentions, each sufficient to win.

[RESOLUTIONAL ANALYSIS]
{_overview_snip(blocks, 450)}

[EVIDENCE OVERVIEW]
{stat_block}

[CONTENTIONS]
{contentions}

[IMPACTS]
Contention 1 alone is sufficient to win. Contention 2 provides independent offense. Contentions 3 and 4 serve as additional layers and tiebreakers. Our evidence comes from encyclopedic, academic, and policy sources including Britannica, university research, and think tanks.

[CLOSING TAG]
The {side_label} side best resolves this debate. We look forward to our rebuttal."""


def _pf_rebuttal(topic: str, blocks: dict[str, Any], side_args: list[dict[str, Any]], side: str) -> str:
    own = side_args[:3]
    prep = blocks.get("rebuttal_prep", [])[:4]
    side_label = "PRO" if side == "aff" else "CON"

    return f"""PUBLIC FORUM {side_label} REBUTTAL — {topic}
Time: 4 minutes | Format: Public Forum

[OVERVIEW OF THE ROUND]
The {side_label} side wins because our constructive case stands and opposition arguments fail.

[DEFENSE]
""" + "\n".join(f"Contention {i+1}: {a.get('point','')} — still true because {a.get('evidence','')[:180]} {_cite(a)}" for i, a in enumerate(own)) + f"""

[OFFENSE — REFUTE OPPOSITION]
""" + "\n".join(f"- {p.get('anticipated_claim','')}: {p.get('response_angle','')[:200]}" for p in prep) + """

[WEIGHING]
Even under opposition framing, our impacts are larger in magnitude and more probable. 
Drop contested points that weren't extended — they aren't in the round.

[CLOSING]
Extend PRO/CON voters. We win this debate."""


def _pf_summary(topic: str, blocks: dict[str, Any], side_args: list[dict[str, Any]], side: str) -> str:
    side_label = "PRO" if side == "aff" else "CON"
    args = _points(side_args, 2)

    return f"""PUBLIC FORUM {side_label} SUMMARY — {topic}
Time: 3 minutes | Format: Public Forum

[ROADMAP]
I will address framework/resolution, collapse to our strongest contention, and weigh.

[COLLAPSE]
The round comes down to: {args[0].get('point', 'our primary contention') if args else 'our primary contention'}.

[EXTEND]
{args[0].get('evidence', '') if args else ''} {_cite(args[0]) if args else ''}

[WEIGHING — IMPACT COMPARISON]
Magnitude: Our impact affects [scope of harm/benefit].
Probability: Supported by {args[0].get('institution', 'multiple sources') if args else 'multiple sources'}.
Timeframe: Our argument matters now, not hypothetically.

[RESPOND TO OPPOSITION SUMMARY]
They cannot win their largest contention without winning a link we have already disproven.

[VOTERS FOR {side_label}]
1. {args[0].get('point', 'Primary argument') if args else 'Primary argument'}
2. Framework / resolutional analysis favors {side_label}
3. Preponderance of evidence

Vote {side_label}."""


def _pf_final_focus(topic: str, blocks: dict[str, Any], side_args: list[dict[str, Any]], side: str) -> str:
    side_label = "PRO" if side == "aff" else "CON"
    arg = side_args[0] if side_args else {}

    return f"""PUBLIC FORUM {side_label} FINAL FOCUS — {topic}
Time: 2 minutes | Format: Public Forum

[CRYSTALLIZE]
This round is simple: {arg.get('point', 'our core argument')}.

[ONE ARGUMENT TO VOTE ON]
{arg.get('evidence', _overview_snip(blocks, 250))}
{_cite(arg) if arg else ''}

[WEIGHING IN 30 SECONDS]
If you believe this impact is true, you MUST vote {side_label}. Nothing in this round 
outweighs it on magnitude or probability.

[FINAL APPEAL]
The evidence is clear. The {side_label} side wins. Thank you."""


def _parli_speech(topic: str, blocks: dict[str, Any], side_args: list[dict[str, Any]], side: str, role: str) -> str:
    args = _points(side_args, 3)
    role_titles = {
        "pm_constructive": ("Prime Minister", "aff", "sets the debate"),
        "lo_constructive": ("Leader of Opposition", "neg", "defines and refutes"),
        "mg_speech": ("Member of Government", "aff", "extends and adds new material"),
        "mo_speech": ("Member of Opposition", "neg", "refutes and builds offense"),
        "gwhip": ("Government Whip", "aff", "summarizes without new arguments"),
        "owhip": ("Opposition Whip", "neg", "summarizes and weighs"),
        "reply": ("Opposition Reply", "neg", "final summary — no new material"),
    }
    title, expected_side, desc = role_titles.get(role, ("Speaker", side, ""))
    contentions = "\n\n".join(
        f"Argument {i+1}: {a.get('point','')}\n{a.get('evidence','')}\n{_cite(a)}"
        for i, a in enumerate(args)
    )

    return f"""PARLIAMENTARY — {title.upper()} — {topic}
Role: {title} ({desc})

[MOTION]
{topic}

[INTRODUCTION / DEFINITION]
This speech {desc}. The motion asks us to evaluate {topic}.

[CONTEXT]
{_overview_snip(blocks, 350)}

[SUBSTANTIVE ARGUMENTS]
{contentions}

[IMPACT / WEIGHING]
These arguments independently support the {'government' if side == 'aff' else 'opposition'} bench. 
The preponderance of evidence from institutional sources supports our side of the motion.

[CLOSING]
For these reasons, the {'government' if side == 'aff' else 'opposition'} should win your votes."""


def _policy_speech(topic: str, blocks: dict[str, Any], side_args: list[dict[str, Any]], side: str, speech: str) -> str:
    args = _points(side_args, 3)
    is_rebuttal = speech in ("1ar", "2nr")
    side_label = "AFFIRMATIVE" if side == "aff" else "NEGATIVE"

    if is_rebuttal:
        return _ld_rebuttal(topic, blocks, side_args, side, 1 if speech == "1ar" else 2).replace(
            "LD", f"POLICY {speech.upper()}"
        )

    advantages = "\n\n".join(
        f"{'Advantage' if side == 'aff' else 'Disadvantage/Off'} {i+1}: {a.get('point','')}\n"
        f"Link: {a.get('evidence','')}\nImpact: Extends to systemic consequences.\n{_cite(a)}"
        for i, a in enumerate(args)
    )

    return f"""POLICY {speech.upper()} — {side_label} — {topic}
Time: 8 minutes | Format: Policy / Cross-Examination

[PLAN / TOPICALITY FRAMING]
Resolution: {topic}

[INHERENCY / SIGNIFICANCE]
{_overview_snip(blocks, 300)}

[{'ADVANTAGES' if side == 'aff' else 'NEGATIVE STRATEGY'}]
{advantages}

[SOLVENCY / IMPACT CALCULUS]
The {'plan' if side == 'aff' else 'counterplan/status quo'} solves the identified harms. 
Evidence from peer-reviewed and policy institutions supports our solvency claims.

[CONCLUSION]
Vote {'Affirmative' if side == 'aff' else 'Negative'}."""


def _worlds_speech(topic: str, blocks: dict[str, Any], side_args: list[dict[str, Any]], side: str, speech: str) -> str:
    if speech == "constructive":
        return _pf_constructive(topic, blocks, side_args, side).replace("PUBLIC FORUM", "WORLD SCHOOLS").replace("4 minutes", "8 minutes")
    if speech == "rebuttal":
        return _pf_rebuttal(topic, blocks, side_args, side).replace("PUBLIC FORUM", "WORLD SCHOOLS").replace("4 minutes", "8 minutes")
    if speech == "summary":
        return _pf_summary(topic, blocks, side_args, side).replace("PUBLIC FORUM", "WORLD SCHOOLS")
    if speech == "reply":
        return _pf_final_focus(topic, blocks, side_args, side).replace("FINAL FOCUS", "REPLY").replace("2 minutes", "4 minutes")
    return ""


def generate_speech(
    topic: str,
    blocks: dict[str, Any],
    debate_format: str,
    speech_type: str,
    side: str,
) -> dict[str, Any]:
    """
    Build a full copy-paste speech for the given format, speech type, and side.
    side: 'aff' or 'neg'
    """
    fmt = DEBATE_FORMATS.get(debate_format)
    if not fmt:
        raise ValueError(f"Unknown debate format: {debate_format}")

    speeches = fmt["speeches"]
    if speech_type not in speeches:
        raise ValueError(f"Unknown speech type '{speech_type}' for format '{debate_format}'")

    meta = speeches[speech_type]
    if meta["side"] != "both" and meta["side"] != side:
        side = meta["side"]  # force correct side for role speeches

    aff_args = blocks.get("affirmative", [])
    neg_args = blocks.get("negative", [])
    side_args = aff_args if side == "aff" else neg_args

    text = ""

    if debate_format == "ld":
        if speech_type == "aff_constructive":
            text = _ld_aff_constructive(topic, blocks, aff_args)
        elif speech_type == "neg_constructive":
            text = _ld_neg_constructive(topic, blocks, neg_args)
        elif speech_type in ("aff_rebuttal_1", "aff_rebuttal_2"):
            num = 1 if speech_type == "aff_rebuttal_1" else 2
            text = _ld_rebuttal(topic, blocks, aff_args, "aff", num)
        elif speech_type == "neg_rebuttal":
            text = _ld_rebuttal(topic, blocks, neg_args, "neg", 1)

    elif debate_format == "pf":
        if speech_type == "constructive":
            text = _pf_constructive(topic, blocks, side_args, side)
        elif speech_type == "rebuttal":
            text = _pf_rebuttal(topic, blocks, side_args, side)
        elif speech_type == "summary":
            text = _pf_summary(topic, blocks, side_args, side)
        elif speech_type == "final_focus":
            text = _pf_final_focus(topic, blocks, side_args, side)

    elif debate_format == "parli":
        text = _parli_speech(topic, blocks, side_args, side, speech_type)

    elif debate_format == "policy":
        text = _policy_speech(topic, blocks, side_args, side, speech_type)

    elif debate_format == "worlds":
        text = _worlds_speech(topic, blocks, side_args, side, speech_type)

    if not text:
        raise ValueError("Could not generate speech for this combination.")

    speech_kind = detect_speech_kind(speech_type)
    overview = blocks.get("overview", "")
    used_llm = False
    generation_mode = "template"
    final_text: str | None = None

    if is_llm_available():
        ai_text, ok = generate_ai_speech(
            topic,
            blocks,
            fmt["name"],
            meta["label"],
            side,
            meta["minutes"],
            speech_kind=speech_kind,
            debate_format=debate_format,
        )
        if ok and ai_text:
            final_text = ai_text
            used_llm = True
            generation_mode = "ai"

    if not final_text:
        smooth_text = build_smooth_speech(
            topic,
            blocks,
            side_args,
            side,
            speech_kind=speech_kind,
            overview=overview,
            debate_format=debate_format,
            target_minutes=meta["minutes"],
        )
        polished, polished_ok = polish_speech(
            smooth_text,
            topic,
            fmt["name"],
            meta["label"],
            side,
            meta["minutes"],
        )
        final_text = polished
        if polished_ok:
            used_llm = True
            generation_mode = "ai_polish"

    word_count = len(final_text.split())
    est_minutes = round(word_count / 150, 1)  # ~150 wpm debate pace

    return {
        "format": debate_format,
        "format_name": fmt["name"],
        "speech_label": meta["label"],
        "speech_type": speech_type,
        "side": side,
        "side_label": "Affirmative / Pro" if side == "aff" else "Negative / Con",
        "target_minutes": meta["minutes"],
        "estimated_minutes": est_minutes,
        "word_count": word_count,
        "speech_text": final_text,
        "smooth": True,
        "llm_enhanced": used_llm,
        "llm_available": is_llm_available(),
        "generation_mode": generation_mode,
    }
