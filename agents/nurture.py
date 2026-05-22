"""
Agent 5 — Nurture Sequencer (Phase 2/3 scaffolding).

This module defines the *interface* for the nurture sequencer. Phase 1 does
NOT activate sending. Phase 2 will wire Resend + a template registry; Phase 3
will replace the fixed cadence with an LLM-driven next-best-action.

Design contract (so Phase 2 can drop in without changing /audit):

    plan_next_action(lead, history_count) -> NurtureAction | None
    is_sequencer_enabled() -> bool

Inputs are read-only snapshots of what `/audit` already has on hand.
Outputs are descriptive (template + delay + channel + rationale). Sending
itself stays in Phase 2 so we never accidentally email anyone from Phase 1.

Warm/cold routing is enforced in db.leads.classify_temperature; this agent
just decides what each tier sees next.

    hot  / warm  → enter active sequence (D+0 hours after audit, then D+2/+5)
    cool         → educational drip (weekly)
    cold         → no sequencer, quarterly check-in
"""

from dataclasses import dataclass
from typing import Literal, Optional

Temperature = Literal["hot", "warm", "cool", "cold"]
Channel = Literal["email", "sms"]


@dataclass
class LeadSnapshot:
    email: str
    business_name: str
    temperature: Temperature
    segment: str
    seo_score: int
    monthly_leak: int


@dataclass
class NurtureAction:
    template: str
    send_after_hours: int
    channel: Channel
    rationale: str


def is_sequencer_enabled() -> bool:
    """Phase 1: hard-off. Phase 2 will gate this on an env var."""
    return False


def plan_next_action(
    lead: LeadSnapshot, history_count: int = 0
) -> Optional[NurtureAction]:
    """
    Return the next action for this lead, or None if no action is due.

    Phase 1: returns the D+0 audit-recap action for hot/warm with no prior sends.
    Phase 2 will expand into a full state machine using `history_count` and a
    template registry.
    """
    if not is_sequencer_enabled():
        return None

    if lead.temperature in ("hot", "warm") and history_count == 0:
        return NurtureAction(
            template="audit_intro_day0",
            send_after_hours=2,
            channel="email",
            rationale=f"Initial Day-0 outreach for {lead.temperature} lead",
        )

    if lead.temperature == "cool" and history_count == 0:
        return NurtureAction(
            template="educational_intro_week0",
            send_after_hours=24 * 7,
            channel="email",
            rationale="Weekly educational drip for cool lead",
        )

    return None
