# Source Scaling Rollout Plan

## Objective
Scale ATS source coverage (Greenhouse, Lever, Ashby) from a small curated list to broad market signal while maintaining data quality, system reliability, and predictable cost.

## Phase 1 (Week 1-2): Foundation + First Scale
1. Goal: grow to ~100-200 sources with stable ingest.
2. Build: source onboarding workflow, source validation checks, ingest error taxonomy, per-source health dashboard.
3. Guardrails: provider concurrency caps, retry with backoff, ingest timeout budget.
4. Success metrics:
- >=90% source success rate per run
- p95 ingest duration within target
- 0 DB saturation events

## Phase 2 (Week 3-4): Quality + Reliability
1. Goal: improve data trust as volume increases.
2. Build: duplicate detection, stronger normalization audits (`postedAt`, location, salary), stale-source auto-disable rules.
3. Guardrails: anomaly alerts for sudden volume drops/spikes by provider/source.
4. Success metrics:
- Duplicate rate below threshold
- Missing-critical-field rate trending down
- Alert MTTR under target

## Phase 3 (Week 5-6): Broad Coverage Expansion
1. Goal: scale to ~500+ sources without operational regressions.
2. Build: batch onboarding by priority, tiered ingest cadence (high/medium/low frequency), infra tuning.
3. Guardrails: run-budget limits (time/cost), safe-fail behavior during provider outages.
4. Success metrics:
- Sustained run success
- Predictable infra cost per 1k jobs
- Steady growth in unique active jobs

## Phase 4 (Week 7+): Market Signal Maturity
1. Goal: make macro analytics decision-grade.
2. Build: confidence scoring, source weighting to reduce bias, historical backfill strategy where available.
3. Guardrails: explicit UI coverage caveats (provider/company footprint transparency).
4. Success metrics:
- Stable month-over-month trend continuity
- Fewer unexplained trend discontinuities

## Operational KPIs
1. Ingest success rate by provider/source
2. Jobs fetched/upserted/deactivated per run
3. Duplicate ratio and normalization failure ratio
4. Median and p95 ingest duration
5. Cost per run and cost per 1k active jobs
6. Source churn (newly failing vs recovered)

## Immediate Next Actions
1. Define onboarding schema and validation checklist for new sources.
2. Create a Phase 1 target list (top 150 companies).
3. Add run-level dashboard and alerts before bulk onboarding.
4. Start with one provider-heavy batch first, then expand cross-provider.
