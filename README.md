# Job Market Tracker

Small Next.js dashboard for exploring US software and data job listings with lightweight filtering and trend views.

This is a study project for practicing Cursor best practices, the BMAD method, and Codex CLI workflows. I made it for fun. Available at [https://job-market-tracker-live.vercel.app/](https://job-market-tracker-live.vercel.app/).

## What It Does

- Fetches normalized job data from server-side API routes
- Displays top-level counts for total, SWE, and data roles
- Filters listings by role type, work mode, seniority, location, tech keyword, and salary floor
- Shows work mode distribution and posting volume over time
- Renders a table of individual roles with salary, posting date, tech stack, and source links
- Supports scheduled ingestion from live ATS feeds

## Current State

The app now supports live data ingestion from:

- Greenhouse
- Lever
- Ashby

Runtime behavior:

- [`src/app/api/jobs/route.ts`](./src/app/api/jobs/route.ts) serves normalized jobs to the frontend
- [`src/app/api/cron/ingest/route.ts`](./src/app/api/cron/ingest/route.ts) ingests live job data on a schedule
- [`src/lib/company-sources.ts`](./src/lib/company-sources.ts) defines the default curated company list
- [`src/lib/providers.ts`](./src/lib/providers.ts) contains provider-specific adapters
- [`src/lib/db.ts`](./src/lib/db.ts) manages the Postgres schema and job storage

If `DATABASE_URL` is not configured, the app falls back to the sample dataset in [`data/jobs-sample.json`](./data/jobs-sample.json).

Important coverage note:

- Greenhouse / Lever / Ashby public board APIs mostly expose current open postings, not full historical archives.
- Historical charts are limited by how long this app has been ingesting and by the selected analytics window.

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS 4
- Recharts
- Postgres
- Vercel Cron Jobs

## Run Locally

Create an environment file from [`.env.example`](./.env.example), then install dependencies and start the development server:

```bash
npm install
npm run dev
```

Environment variables:

- `DATABASE_URL` for Postgres
- `CRON_SECRET` for the ingestion endpoint
- `INGEST_HEALTH_SECRET` optional override secret for `/api/analytics/ingest-health` (falls back to `CRON_SECRET`)
- `JOB_SOURCES_REGISTRY_PATH` file path to the source registry JSON (default `./data/source-registry.json`)
- `JOB_SOURCES_JSON` to fully override the default source list
- `JOB_SOURCES_APPEND_JSON` to append extra sources on top of defaults
- `INGEST_PROVIDER_CONCURRENCY` max concurrent ingests per provider (default `2`)
- `INGEST_FETCH_MAX_ATTEMPTS` fetch retries per source (default `3`)
- `INGEST_FETCH_BASE_BACKOFF_MS` base backoff for retries in milliseconds (default `750`)
- `INGEST_AUTO_DISABLE_FAILURE_STREAK` consecutive failures before temporary auto-disable (default `5`)
- `INGEST_AUTO_DISABLE_COOLDOWN_HOURS` cooldown window for auto-disabled sources (default `24`)

Open `http://localhost:3000`.

### Manual Ingest Trigger

You can run ingestion manually (local or production) to force a refresh:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/ingest
```

The endpoint returns summary stats such as `sourcesProcessed`, `fetchedCount`, and `errors`.
It also returns run-level `alerts` for failure spikes, skipped sources, and high retry volume.

It now also includes per-source execution details (`sourceResults`) with:
- `status`
- `attemptCount`
- `durationMs`
- optional `errorCategory`

When failure streak policy is triggered, a source run is recorded as `skipped` and excluded from fetch/upsert work until cooldown elapses.

### Expanding Coverage Quickly

Preferred flow: maintain `data/source-registry.json` (or set `JOB_SOURCES_REGISTRY_PATH`) and validate before ingest.

You can still use `JOB_SOURCES_JSON` (override) and `JOB_SOURCES_APPEND_JSON` (append) when needed. Values must be JSON arrays of:

```json
{
  "slug": "company-key",
  "companyName": "Company Name",
  "provider": "greenhouse | lever | ashby",
  "boardToken": "public-board-token",
  "enabled": true,
  "hqLocation": "City, ST",
  "priorityTier": "high | medium | low",
  "ingestCadence": "twice_daily | daily | weekly",
  "owner": "team-or-person",
  "notes": "optional"
}
```

Examples:

```bash
JOB_SOURCES_JSON='[{"slug":"stripe","companyName":"Stripe","provider":"greenhouse","boardToken":"stripe","enabled":true,"hqLocation":"San Francisco, CA"},{"slug":"openai","companyName":"OpenAI","provider":"ashby","boardToken":"openai","enabled":true,"hqLocation":"San Francisco, CA"}]'
JOB_SOURCES_APPEND_JSON='[{"slug":"datadog","companyName":"Datadog","provider":"greenhouse","boardToken":"datadog","enabled":true,"hqLocation":"New York, NY"}]'
```

### Source Validation Dry Run

Validate source config before ingest (no DB writes):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/validate-sources
```

Response includes:
- `ok`, `errors`, `warnings`
- source counts (`sourceCount`, `enabledCount`, `providerCounts`)
- `sampleSources` preview (`boardToken` is redacted)

### Production Ingest Trigger

In production, call the live endpoint with the same bearer token:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://job-market-tracker-live.vercel.app/api/cron/ingest
```

Current Vercel cron schedule is daily at `0 0 * * *` (UTC).

### Ingest Health API

Use this endpoint for source-level ingest reliability and trend monitoring:

```bash
curl -H "Authorization: Bearer $INGEST_HEALTH_SECRET" \
  http://localhost:3000/api/analytics/ingest-health?hours=168
```

Response includes:
- `bySource`: success/failure/skipped counts and recent status per source
- `recentRuns`: latest run outcomes with counts and error messages

## Available Scripts

- `npm run dev` starts the local development server
- `npm run build` creates a production build
- `npm run start` serves the production build
- `npm run lint` runs ESLint

## Project Structure

```text
src/
  app/
    api/cron/ingest/route.ts   Scheduled ingestion endpoint
    api/cron/validate-sources/route.ts   Source config dry-run validator
    api/jobs/route.ts   API endpoint for job data
    page.tsx            Dashboard UI
    layout.tsx          App shell and metadata
    globals.css         Global styles
  lib/
    jobs.ts             Shared job types
    db.ts               Postgres schema and queries
    providers.ts        ATS provider adapters
    ingest.ts           Ingestion workflow
data/
  jobs-sample.json      Local sample dataset
  source-registry.json  Source onboarding registry
```

## Notes

- The dashboard is client-rendered and fetches from the local API on load.
- The intended production target is Vercel, not GitHub Pages, because live ingestion requires server routes and cron execution.
- The default live sources are a curated set of public boards: Stripe, Vercel, Plaid, and OpenAI.
- Jobs are normalized into a shared schema and filtered down to SWE and data roles.

## Next Improvements

- Add a richer company/source configuration UI instead of code-based source lists
- Track observation history separately from source `postedAt` for stronger time-series analysis
- Support more filters such as seniority, location, and salary range
- Add tests around provider adapters and ingestion behavior
