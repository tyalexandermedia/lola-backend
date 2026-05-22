"""
Three static cold-outreach variants (A/B/C). Each ≤120 words, plain text,
subject ≤50 chars, no spam triggers. Round-robined per send for A/B/C testing.

Token replacement: {{first_name}}, {{business_name}}, {{city}}, {{audit_link}},
{{unsub_link}}.
"""

from dataclasses import dataclass
from typing import Dict, Literal

VariantKey = Literal["A", "B", "C"]


@dataclass
class Variant:
    key: VariantKey
    subject_tmpl: str
    body_tmpl: str


VARIANTS: Dict[VariantKey, Variant] = {
    "A": Variant(
        key="A",
        subject_tmpl="Quick question, {{first_name}}",
        body_tmpl="""Hey {{first_name}},

Quick question — how many of your last 10 jobs came from Google vs. word of mouth?

If less than half, your local SEO is probably leaking $5-15k a month in missed calls. I built a free 2-minute audit that finds the exact gaps:

{{audit_link}}

No login, no spam. You get a custom playbook with what to fix in priority order.

— Ty
Tampa Bay

{{unsub_link}}
""",
    ),
    "B": Variant(
        key="B",
        subject_tmpl="5 keywords in 3 weeks for Sandbar",
        body_tmpl="""{{first_name}},

I got Sandbar Soft Wash ranked for 5 keywords in 3 weeks — they're now top-3 for "soft wash Palm Harbor." Real local results, not vanity metrics.

Built a free 2-minute audit that does the same diagnosis for {{business_name}}:

{{audit_link}}

You get a PDF with the exact fixes ranked by impact. No call required.

— Ty
Tampa Bay

{{unsub_link}}
""",
    ),
    "C": Variant(
        key="C",
        subject_tmpl="Three-line note for {{business_name}}",
        body_tmpl="""{{first_name}},

Three lines:

1. I run free SEO audits for Florida contractors.
2. Most find $5-15k a month in missed jobs.
3. Yours: {{audit_link}}

— Ty

{{unsub_link}}
""",
    ),
}


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
