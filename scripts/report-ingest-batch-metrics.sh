#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <ingest-response-json-path>"
  exit 1
fi

INPUT_FILE="$1"

if [[ ! -f "$INPUT_FILE" ]]; then
  echo "File not found: $INPUT_FILE"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for this script."
  exit 1
fi

jq '{
  mode,
  sourcesProcessed,
  skippedCount,
  fetchedCount,
  upsertedCount,
  deactivatedCount,
  failures: ([.sourceResults[]? | select(.status == "failed")] | length),
  successes: ([.sourceResults[]? | select(.status == "success")] | length),
  skipped: ([.sourceResults[]? | select(.status == "skipped")] | length),
  retriedSources: ([.sourceResults[]? | select(.attemptCount > 1)] | length),
  failureRate: (
    (if .sourcesProcessed > 0
      then (([.sourceResults[]? | select(.status == "failed")] | length) / .sourcesProcessed)
      else 0
    end)
  ),
  retryRate: (
    (if .sourcesProcessed > 0
      then (([.sourceResults[]? | select(.attemptCount > 1)] | length) / .sourcesProcessed)
      else 0
    end)
  ),
  skippedRate: (
    (if .sourcesProcessed > 0
      then (([.sourceResults[]? | select(.status == "skipped")] | length) / .sourcesProcessed)
      else 0
    end)
  ),
  criticalAlerts: ([.alerts[]? | select(.level == "critical")] | length),
  warnAlerts: ([.alerts[]? | select(.level == "warn")] | length)
}' "$INPUT_FILE"
