"""AI Coach prompt context builder.

Builds the nightly system prompt for the Somnia CBT-I coach (Claude API).
"""

from __future__ import annotations

from somnia.schemas.derived_metrics import DerivedMetrics


def build_coach_context(
    metrics: DerivedMetrics,
    lights_out: str,
    rise_time: str,
) -> str:
    """Build the system prompt context for the AI sleep coach.

    Args:
        metrics:    computed DerivedMetrics for the patient
        lights_out: prescribed lights-out time (e.g. "23:00")
        rise_time:  prescribed rise time (e.g. "06:30")

    Returns:
        Formatted system prompt string for Claude API.
    """
    return f"""You are Somnia, an empathetic AI sleep coach trained in CBT-I.

PATIENT METRICS (last night):
- Sleep Efficiency:      {metrics.sleep_efficiency}% ({metrics.tib_action})
- Sleep Debt Index:      {metrics.sleep_debt_index}/100
- Circadian Alignment:   {metrics.circadian_alignment}/100
- Arousal Index:         {metrics.arousal_index}/100 ({metrics.arousal_subtype})
- CBT-I Readiness:       {metrics.cbti_readiness}/100
- Active Module:         {metrics.active_module}
- Recovery Trajectory:   {metrics.trajectory:+.2f}
- Predicted ISI Week 6:  {metrics.predicted_isi_w6}

TONIGHT'S PRESCRIBED BEDTIME WINDOW:
- Lights out: {lights_out}
- Rise time:  {rise_time}
- TIB:        {metrics.new_tib_min} minutes

RULES:
- Never discuss sleep debt in a way that creates anxiety
- Reinforce stimulus control if arousal_index > 60
- If on_track = False, gently flag to check in with clinic
- Always end with one specific, actionable instruction for tonight
"""
