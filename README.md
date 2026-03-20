# Job Market Tracker

Small Next.js dashboard for exploring US software and data job listings with lightweight filtering and trend views.

This is a study project for practicing Cursor best practices, the BMAD method, and Codex CLI workflows. I made it for fun. Available at [https://job-market-tracker-live.vercel.app/](https://job-market-tracker-live.vercel.app/).

## What It Does

- Fetches normalized job data from server-side API routes
- Displays top-level counts for total, SWE, and data roles
- Filters listings by role type and work mode
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

Open `http://localhost:3000`.

### Manual Ingest Trigger

You can run ingestion manually (local or production) to force a refresh:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/ingest
```

The endpoint returns summary stats such as `sourcesProcessed`, `fetchedCount`, and `errors`.

### Production Ingest Trigger

In production, call the live endpoint with the same bearer token:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://job-market-tracker-live.vercel.app/api/cron/ingest
```

Current Vercel cron schedule is daily at `0 0 * * *` (UTC).

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
