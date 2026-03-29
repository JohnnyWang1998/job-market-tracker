# Top-150 Onboarding Plan

This folder contains the first source-onboarding candidate pool and 6 execution batches.

## Files

- `top-150-candidates.json`: full ranked candidate list (150 entries)
- `batch-summary.json`: batch sizes and provider distribution
- `batches/*.json`: six batches of 25 sources each

## Batch Strategy

1. Start with `batch-01-greenhouse-heavy.json`.
2. Measure run outcomes (`success`, `failed`, `skipped`, retries) after ingest.
3. Continue only if Batch 1 metrics are acceptable.
4. Expand to subsequent mixed/provider-balanced batches.

## Dry-Run Validation

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/validate-sources
```

## Execute Batch 1 (Greenhouse-Heavy)

```bash
export JOB_SOURCES_APPEND_JSON="$(jq -c . data/source-onboarding/batches/batch-01-greenhouse-heavy.json)"

curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/validate-sources

curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/ingest > /tmp/ingest-batch-01.json

./scripts/report-ingest-batch-metrics.sh /tmp/ingest-batch-01.json
```

## Promotion Criteria (Suggested)

- Source success rate >= 90%
- Failure rate <= 10%
- Retry-required sources <= 25%
- Skipped sources <= 10%
- No critical alerts in ingest response

## Next Batch Progression

- Batch 2: `batch-02-greenhouse-plus-lever.json`
- Batch 3: `batch-03-mixed-greenhouse-lever.json`
- Batch 4: `batch-04-lever-plus-ashby.json`
- Batch 5: `batch-05-ashby-plus-lever.json`
- Batch 6: `batch-06-broad-final-mix.json`

Before each promotion, run validation + ingest + metrics and log outcomes.
