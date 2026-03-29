# Batch 01 Report (2026-03-29)

Batch: `batch-01-greenhouse-heavy`

## Metrics

- Sources processed: `27`
- Successes: `21`
- Failures: `6`
- Skipped: `0`
- Retry-required sources: `6`
- Failure rate: `22.22%`
- Retry rate: `22.22%`
- Fetched: `2433`
- Upserted: `2433`
- Deactivated: `58`
- Warn alerts: `7`
- Critical alerts: `0`

## Promotion Criteria Check

- Source success rate >= 90%: `NO` (current success rate is `77.78%`)
- Failure rate <= 10%: `NO` (`22.22%`)
- Retry-required sources <= 25%: `YES` (`22.22%`)
- Skipped sources <= 10%: `YES` (`0%`)
- No critical alerts: `YES`

Decision: `Do not promote to Batch 2 yet.`

## Failed Sources (404)

- `doordash`
- `notion`
- `canva`
- `ramp`
- `shopify`
- `zendesk`

## Immediate Next Actions

1. Verify board tokens/slugs for the six failed Greenhouse sources.
2. Patch `batch-01-greenhouse-heavy.json` with corrected tokens.
3. Re-run Batch 1 and regenerate metrics report.
4. Promote to Batch 2 only when success criteria pass.
