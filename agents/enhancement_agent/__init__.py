"""
Lola Enhancement Agent — turns raw audit data into contractor gold.

Pipeline:
  /audit completes → save raw audit → fire-and-forget enhancement task →
  Claude Opus 4.7 transforms data → structured JSON cached in
  audit_enhancements table → frontend lazily fetches via
  GET /audits/<id>/enhancement and renders below the existing report
  sections.
"""
