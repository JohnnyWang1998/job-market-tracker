# Source Scaling Rollout Plan

## Objective
Scale ATS source coverage (Greenhouse, Lever, Ashby) from a small curated list to broad market signal while maintaining data quality, system reliability, and predictable cost.

## Scope And Constraints
1. In scope:
- Public ATS board ingestion for Greenhouse, Lever, and Ashby
- Source onboarding, health monitoring, and quality controls
- Macro analytics reliability improvements

2. Out of scope for this plan:
- LinkedIn/Indeed/Glassdoor integrations
- Non-ATS scraping strategies
- Paid data provider integrations

3. Key constraints:
- Public ATS APIs mostly expose current open postings, not full historical archives
- Provider uptime and per-source data quality vary materially

## Baseline (Capture Before Scaling)
Record these before onboarding more sources:
1. Total enabled sources
2. Sources processed per run
3. Run success rate
4. Median and p95 ingest duration
5. Jobs fetched, upserted, deactivated per run
6. Duplicate ratio
7. Missing critical fields ratio (`postedAt`, title, location)
8. DB CPU and write IOPS during ingest window

## KPI Definitions
1. Source success rate:
`successful_sources / processed_sources`

2. Run success rate:
`successful_runs / total_runs`

3. Duplicate ratio:
`duplicate_jobs / total_jobs_ingested`

4. Missing critical fields ratio:
`jobs_missing_critical_fields / total_jobs_ingested`

5. Cost efficiency:
`infra_cost_per_day / active_jobs_count * 1000`

6. Source churn:
`newly_failing_sources` and `recovered_sources` per day

## Phase 1 (Week 1-2): Foundation + First Scale
1. Goal:
Scale to ~100-200 sources with stable ingest and observable operations.

2. Deliverables:
- Source onboarding schema and validator
- Error taxonomy (`network`, `429`, `provider_4xx`, `parse_error`, `db_error`)
- Per-source health dashboard
- Retry/backoff and concurrency controls by provider

3. Guardrails:
- Provider concurrency caps enabled
- Time budget per run enforced
- Alert on run failures and source failure spikes

4. Exit criteria:
- Source success rate >= 90%
- Run success rate >= 95%
- p95 ingest duration within agreed SLO
- No DB saturation incidents

## Phase 2 (Week 3-4): Quality + Reliability
1. Goal:
Improve trust in data as volume grows.

2. Deliverables:
- Duplicate detection and canonicalization rules
- Normalization audits for `postedAt`, location, salary
- Source auto-disable policy after repeated failures
- Provider-level anomaly detection for volume shifts

3. Guardrails:
- Alert thresholds for unexpected volume drops/spikes
- Manual review queue for high-impact anomalies

4. Exit criteria:
- Duplicate ratio below threshold
- Missing critical fields ratio trending down week over week
- Alert MTTR under target

## Phase 3 (Week 5-6): Broad Coverage Expansion
1. Goal:
Scale to ~500+ sources without operational regressions.

2. Deliverables:
- Prioritized source batches by relevance/quality
- Tiered ingest cadence (high/medium/low)
- Capacity tuning for DB and ingest workers

3. Guardrails:
- Hard cap on per-run source count to avoid overload
- Cost and latency budgets enforced per day

4. Exit criteria:
- Stable run success at target scale
- Predictable cost per 1k active jobs
- Consistent growth in unique active jobs

## Phase 4 (Week 7+): Market Signal Maturity
1. Goal:
Make macro analytics dependable for decision support.

2. Deliverables:
- Source confidence scoring
- Coverage-weighted market indicators
- Transparent UI caveats for source footprint and bias

3. Exit criteria:
- Month-over-month trend continuity is stable
- Fewer unexplained trend discontinuities
- Stakeholder confidence sign-off

## Weekly Execution Cadence
1. Monday:
- Approve source batch
- Confirm guardrail thresholds
- Verify capacity headroom

2. Mid-week:
- Review ingest errors and source health
- Triage anomalies and disable failing sources if needed
- Validate KPI trajectory

3. Friday:
- Publish weekly scorecard
- Decide next batch size and provider mix
- Update risks and mitigations

## Risk Register
1. Coverage bias risk:
- Risk: ATS-only coverage misses parts of tech market
- Mitigation: disclose coverage scope and add weighting in analytics

2. Reliability risk:
- Risk: rate limits and provider instability
- Mitigation: provider-specific backoff, retries, and load caps

3. Data quality risk:
- Risk: inconsistent dates/locations/salary fields
- Mitigation: stricter normalization checks and quality dashboards

4. Cost risk:
- Risk: infra cost spikes with source growth
- Mitigation: daily cost budget alarms and adaptive cadence

## Phase 1 Immediate Task List
1. Finalize source schema contract and validation rules.
2. Define provider concurrency defaults and retry policy.
3. Implement run and source health metrics with alerting.
4. Produce top-150 source candidate list and batch into groups of 25.
5. Run first onboarding batch and measure KPI deltas.
6. Hold post-batch review and adjust batch size.

## Decision Log (Keep Updated)
1. Current max sources per run: `TBD`
2. Provider concurrency caps: `2` (default via `INGEST_PROVIDER_CONCURRENCY`)
3. Run schedule (UTC): `0 0 * * *`
4. Failure threshold for auto-disable: `5` failures with `24h` cooldown by default (`INGEST_AUTO_DISABLE_FAILURE_STREAK`, `INGEST_AUTO_DISABLE_COOLDOWN_HOURS`)
5. Duplicate policy version: `TBD`

## Implementation Status (2026-03-28)
1. Completed:
- Provider-level ingestion concurrency control (`INGEST_PROVIDER_CONCURRENCY`)
- Fetch retry with exponential backoff (`INGEST_FETCH_MAX_ATTEMPTS`, `INGEST_FETCH_BASE_BACKOFF_MS`)
- Error categorization in ingest summary (`network`, `rate_limit`, `provider_4xx`, `provider_5xx`, `parse_error`, `db_error`, `unknown`)
- Ingest health API for dashboarding: `/api/analytics/ingest-health?hours=168`
- Auto-disable policy for repeated failures with cooldown (`skipped` runs)
- Source registry contract with strict validation (`data/source-registry.json`, `JOB_SOURCES_REGISTRY_PATH`)
- Dry-run validation endpoint: `/api/cron/validate-sources`

2. Remaining high-priority items:
- Alerting pipeline (run failure, source failure spike, anomaly detection)
- Batch onboarding workflow (target list, provider-first rollout, runbook)

## Batch 1 Execution Snapshot (2026-03-29)
1. Validation mode: `registry_plus_env_append`
2. Sources in run: `27` (`25` greenhouse, `1` lever, `1` ashby)
3. Outcomes (v2 rerun after token/provider corrections):
- Successes: `27`
- Failures: `0`
- Skipped: `0`
- Retry-required sources: `0`
4. Rates:
- Success rate: `100%`
- Failure rate: `0%`
- Retry rate: `0%`
5. Decision: `Ready for Batch 2`
6. Corrections applied:
- `doordash` -> `doordashusa` (greenhouse)
- `notion` provider changed to `ashby`
- `ramp` provider changed to `ashby`
- Replaced `canva`, `shopify`, `zendesk` with `opendoor`, `tripadvisor`, `stitchfix`
