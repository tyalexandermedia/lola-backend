# Evidence Engine

The next bottleneck for LOLA OS is evidence velocity.

The architecture is useful only if every meaningful result can become structured evidence that improves future decisions.

## What Should Create Evidence

- Lead
- Call
- Quote
- Estimate
- Won job
- Review
- Ranking movement
- AI visibility movement
- GBP action
- Landing page conversion
- Email campaign
- Social post
- Experiment result

## Evidence Flow

```text
Event
↓
Evidence Entry
↓
Knowledge
↓
Blueprint Scorecard
↓
Blueprint Update
↓
Product or Client Deployment
```

## Rule

No raw private customer data should be promoted into reusable knowledge. Evidence should preserve the learning, source, date, context, metric, and confidence without leaking secrets or PII.

## First Implementation

The first implementation is intentionally small:

- `CORE/schemas/evidence-entry.schema.json`
- `scripts/blueprint_scorecard.py`

This gives LOLA OS a way to measure blueprint quality before building a larger evidence database.
