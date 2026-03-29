# Batch 01 Report (2026-03-29, v2)

Batch: `batch-01-greenhouse-heavy`

## Metrics

- Sources processed: `27`
- Successes: `27`
- Failures: `0`
- Skipped: `0`
- Retry-required sources: `0`
- Failure rate: `0%`
- Retry rate: `0%`
- Fetched: `2744`
- Upserted: `2744`
- Deactivated: `58`
- Warn alerts: `0`
- Critical alerts: `0`

## Promotion Criteria Check

- Source success rate >= 90%: `YES` (`100%`)
- Failure rate <= 10%: `YES` (`0%`)
- Retry-required sources <= 25%: `YES` (`0%`)
- Skipped sources <= 10%: `YES` (`0%`)
- No critical alerts: `YES`

Decision: `Ready to promote to Batch 2.`

## Token/Provider Corrections Applied

- `doordash` -> `doordashusa` (greenhouse)
- `notion` provider changed to `ashby`
- `ramp` provider changed to `ashby`
- Replaced `canva`, `shopify`, `zendesk` with verified Greenhouse sources: `opendoor`, `tripadvisor`, `stitchfix`
