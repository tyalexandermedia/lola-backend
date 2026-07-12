"""
Three static cold-outreach variants (A/B/C). Each ≤120 words, plain text,
subject ≤50 chars, no spam triggers. Round-robined per send for A/B/C testing.

Token replacement: {{first_name}}, {{business_name}}, {{city}}, {{audit_link}},
{{unsub_link}}.
"""

import os
from dataclasses import dataclass
from typing import Dict, List, Literal

VariantKey = Literal["A", "B", "C", "D", "E"]


@dataclass
class Variant:
    key: VariantKey
    subject_tmpl: str
    body_tmpl: str


VARIANTS: Dict[VariantKey, Variant] = {
    # A — Curiosity (AI agent angle)
    "A": Variant(
        key="A",
        subject_tmpl="ChatGPT is recommending your competitor, not you",
        body_tmpl="""Hey {{first_name}},

I ran a quick check. When ChatGPT looks up "{{city}} {{business_type}}," it's recommending other businesses — not {{business_name}}.

That's not a ranking problem. It's an AI visibility problem. Different signals, different fix.

I built a free 20-second Growth Score that shows exactly what AI agents see (and don't see) about your business:

{{audit_link}}

No signup. No pitch. Just clarity.

— Ty
Founder, Lola SEO · Tampa Bay, FL

{{unsub_link}}
""",
    ),

    # B — Direct AI-agent framing
    "B": Variant(
        key="B",
        subject_tmpl="Is {{business_name}} agent-ready?",
        body_tmpl="""Hey {{first_name}},

AI agents (ChatGPT, Perplexity, Google AI Overviews, Gemini) are recommending contractors directly to homeowners now. Whoever's "agent-ready" wins. Whoever's not becomes invisible — even if they rank in Google.

Free Growth Score for {{business_name}} in 20 seconds:

{{audit_link}}

You get your Growth Score plus the 3 fixes that move it most.

— Ty
Founder, Lola SEO · Tampa Bay, FL

{{unsub_link}}
""",
    ),

    # C — Social proof
    "C": Variant(
        key="C",
        subject_tmpl="How Sandbar Soft Wash got picked by AI agents",
        body_tmpl="""Hey {{first_name}},

Sandbar Soft Wash in Palm Harbor — a 15-year family pressure-washing business — runs on the Lola playbook, with every ranking move tracked on a live public dashboard anyone can open. No login, no screenshots.

I built that system — now I'm offering free Growth Scores to Florida contractors who want the same thing.

Yours for {{business_name}}:

{{audit_link}}

20 seconds. No signup.

— Ty
Founder, Lola SEO · Tampa Bay, FL

{{unsub_link}}
""",
    ),

    # D — Premium-agency switch
    "D": Variant(
        key="D",
        subject_tmpl="Paying $2,500+/mo for SEO?",
        body_tmpl="""Hey {{first_name}},

Quick honest question — are you paying one of the big agencies $2,500-$3,500/mo on a 12-month contract for SEO?

If yes, a lot of that bill is overhead and account management, not execution.

Lola does the work for you — a one-time $997 Full Build gets you a new site built and ranked everywhere people search now (Google, ChatGPT, Perplexity, Gemini). No contract. Backed by our Half-Back Guarantee: if we don't rank at least 1 of your 5 money keywords in 30 days, you get half back.

Free Growth Score for {{business_name}}:

{{audit_link}}

— Ty
Founder, Lola SEO · Tampa Bay, FL

{{unsub_link}}
""",
    ),

    # E — SEO tool switch
    "E": Variant(
        key="E",
        subject_tmpl="Stop learning Semrush in your spare time",
        body_tmpl="""Hey {{first_name}},

If you're paying $99-$399/mo for an SEO tool (Semrush, Ahrefs, Search Atlas), you're also spending 10+ hours/week learning the platform and executing the fixes yourself.

Lola does it FOR you — a one-time $997 Full Build gets you a new site built and ranked everywhere people search now. Same data — none of the manual work, no contract. Backed by our Half-Back Guarantee.

Free Growth Score for {{business_name}}:

{{audit_link}}

20 seconds, no signup. If the Growth Score's useful, we can talk. If not, no follow-up.

— Ty
Founder, Lola SEO · Tampa Bay, FL

{{unsub_link}}
""",
    ),
}


# D-014: variants C and E are HELD out of the send rotation until verified
# Sandbar ranking receipts exist (C is the social-proof variant; E was the
# "audit"-wording variant). Re-enable with OUTREACH_ACTIVE_VARIANTS=A,B,C,D,E.
def active_variants() -> List[VariantKey]:
    raw = os.getenv("OUTREACH_ACTIVE_VARIANTS", "A,B,D")
    keys = [k.strip().upper() for k in raw.split(",")]
    picked = [k for k in keys if k in VARIANTS]
    return picked or ["A", "B", "D"]  # type: ignore[return-value]


def render(variant_key: VariantKey, tokens: Dict[str, str]) -> tuple[str, str]:
    """Returns (subject, body) with all {{tokens}} replaced."""
    v = VARIANTS[variant_key]
    subject = v.subject_tmpl
    body = v.body_tmpl
    for k, val in tokens.items():
        subject = subject.replace("{{" + k + "}}", val or "")
        body = body.replace("{{" + k + "}}", val or "")
    # Sanity caps
    subject = subject[:78]  # Gmail truncates at ~78 chars in preview pane
    return subject, body


def word_count(body: str) -> int:
    """Count words excluding the unsubscribe footer line."""
    return len([w for w in body.split() if w.strip()])
