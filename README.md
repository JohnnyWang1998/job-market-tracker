# Job Market Tracker

Small Next.js dashboard for exploring US software and data job listings with lightweight filtering and trend views.

This is a study project for practicing Cursor best practices, the BMAD method, and Codex CLI workflows. I made it for fun. Available at [https://job-market-tracker.vercel.app/](https://job-market-tracker.vercel.app/).

## What It Does

- Fetches job data from a local API route at `/api/jobs`
- Displays top-level counts for total, SWE, and data roles
- Filters listings by role type and work mode
- Shows work mode distribution and posting volume over time
- Renders a table of individual roles with salary, posting date, and tech stack

## Current State

This app currently runs on sample data stored in [`data/jobs-sample.json`](./data/jobs-sample.json). The API layer in [`src/app/api/jobs/route.ts`](./src/app/api/jobs/route.ts) returns that dataset directly with a fresh `fetchedAt` timestamp.

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS 4
- Recharts

## Run Locally

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

- `npm run dev` starts the local development server
- `npm run build` creates a production build
- `npm run start` serves the production build
- `npm run lint` runs ESLint

## Project Structure

```text
src/
  app/
    api/jobs/route.ts   API endpoint for job data
    page.tsx            Dashboard UI
    layout.tsx          App shell and metadata
    globals.css         Global styles
  lib/
    jobs.ts             Shared job types
data/
  jobs-sample.json      Local sample dataset
```

## Notes

- The dashboard is client-rendered and fetches from the local API on load.
- Refreshing data currently re-reads the same sample dataset rather than pulling from an external source.
- App metadata in [`src/app/layout.tsx`](./src/app/layout.tsx) is still generic and should be updated if this project is published.

## Next Improvements

- Replace the sample dataset with a real ingestion pipeline
- Add source links and job detail views
- Support more filters such as seniority, location, and salary range
- Persist snapshots so trend charts reflect historical crawls instead of sample timestamps
