import postgres from "postgres";
import sampleJobs from "../../data/jobs-sample.json";
import type { CompanySourceConfig } from "@/lib/company-sources";
import type { Job, JobFilterSnapshot, JobsResponse, SavedAlert } from "@/lib/jobs";
import type { NormalizedJobRecord } from "@/lib/providers";

let sqlClient: postgres.Sql | null = null;
let schemaReady = false;

function getSql() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!sqlClient) {
    sqlClient = postgres(process.env.DATABASE_URL, {
      max: 1,
      idle_timeout: 5,
      connect_timeout: 10,
    });
  }

  return sqlClient;
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

function normalizeOptionalText(input?: string) {
  if (!input) {
    return undefined;
  }

  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeAlertFilters(filters: JobFilterSnapshot): JobFilterSnapshot {
  const output: JobFilterSnapshot = {};

  if (filters.roleType) {
    output.roleType = filters.roleType;
  }
  if (filters.workMode) {
    output.workMode = filters.workMode;
  }
  if (filters.seniority) {
    output.seniority = filters.seniority;
  }

  const locationQuery = normalizeOptionalText(filters.locationQuery);
  if (locationQuery) {
    output.locationQuery = locationQuery;
  }

  const techQuery = normalizeOptionalText(filters.techQuery);
  if (techQuery) {
    output.techQuery = techQuery;
  }

  if (typeof filters.salaryMin === "number" && Number.isFinite(filters.salaryMin)) {
    output.salaryMin = Math.max(0, Math.floor(filters.salaryMin));
  }

  return output;
}

function getSampleJobs(): Job[] {
  return (sampleJobs as Array<
    Omit<
      Job,
      | "source"
      | "sourceUrl"
      | "applyUrl"
      | "firstSeenAt"
      | "lastSeenAt"
      | "isActive"
      | "salaryCurrency"
    >
  >).map((job) => ({
    ...job,
    salaryCurrency: "USD",
    source: "greenhouse",
    sourceUrl: "https://job-market-tracker.vercel.app/",
    applyUrl: "https://job-market-tracker.vercel.app/",
    firstSeenAt: job.postedAt,
    lastSeenAt: new Date().toISOString(),
    isActive: true,
  }));
}

export async function ensureSchema() {
  const sql = getSql();
  if (!sql || schemaReady) {
    return;
  }

  await sql`
    create table if not exists companies (
      id serial primary key,
      slug text not null unique,
      name text not null,
      provider text not null,
      board_token text not null,
      enabled boolean not null default true,
      hq_location text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;

  await sql`
    create table if not exists jobs (
      id bigserial primary key,
      company_id integer not null references companies(id) on delete cascade,
      source text not null,
      source_job_id text not null,
      source_url text not null,
      apply_url text,
      title text not null,
      location_raw text not null,
      role_type text not null,
      work_mode text not null,
      seniority text not null,
      salary_min integer,
      salary_max integer,
      salary_currency text,
      technologies jsonb not null default '[]'::jsonb,
      posted_at timestamptz not null,
      first_seen_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now(),
      is_active boolean not null default true,
      missing_runs integer not null default 0,
      description_plain text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (company_id, source_job_id)
    );
  `;

  await sql`
    create table if not exists ingest_runs (
      id bigserial primary key,
      started_at timestamptz not null default now(),
      finished_at timestamptz,
      status text not null,
      provider text,
      company_id integer references companies(id) on delete set null,
      fetched_count integer not null default 0,
      upserted_count integer not null default 0,
      deactivated_count integer not null default 0,
      error_message text
    );
  `;

  await sql`
    create table if not exists saved_alerts (
      id bigserial primary key,
      name text not null,
      webhook_url text not null,
      role_type text,
      work_mode text,
      seniority text,
      location_query text,
      tech_query text,
      salary_min integer,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;

  await sql`
    create table if not exists alert_notifications (
      id bigserial primary key,
      alert_id bigint not null references saved_alerts(id) on delete cascade,
      job_id bigint not null references jobs(id) on delete cascade,
      sent_at timestamptz not null default now(),
      delivery_status text not null,
      error_message text,
      unique (alert_id, job_id)
    );
  `;

  await sql`
    alter table jobs
    add column if not exists work_mode text
  `;

  await sql`
    update jobs
    set work_mode = case
      when location_raw ilike '%hybrid%' then 'hybrid'
      when location_raw ilike '%remote%' then 'remote'
      else 'onsite'
    end
    where work_mode is null
  `;

  schemaReady = true;
}

interface SavedAlertRow {
  id: string;
  name: string;
  webhook_url: string;
  role_type: Job["roleType"] | null;
  work_mode: Job["workMode"] | null;
  seniority: Job["seniority"] | null;
  location_query: string | null;
  tech_query: string | null;
  salary_min: number | null;
  created_at: string;
  updated_at: string;
}

function mapSavedAlertRow(row: SavedAlertRow): SavedAlert {
  return {
    id: Number(row.id),
    name: row.name,
    webhookUrl: row.webhook_url,
    filters: sanitizeAlertFilters({
      roleType: row.role_type ?? undefined,
      workMode: row.work_mode ?? undefined,
      seniority: row.seniority ?? undefined,
      locationQuery: row.location_query ?? undefined,
      techQuery: row.tech_query ?? undefined,
      salaryMin: row.salary_min ?? undefined,
    }),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSavedAlerts(): Promise<SavedAlert[]> {
  const sql = getSql();
  if (!sql) {
    return [];
  }

  await ensureSchema();
  const rows = await sql<SavedAlertRow[]>`
    select
      id,
      name,
      webhook_url,
      role_type,
      work_mode,
      seniority,
      location_query,
      tech_query,
      salary_min,
      created_at,
      updated_at
    from saved_alerts
    order by created_at desc
  `;

  return rows.map(mapSavedAlertRow);
}

export async function createSavedAlert(input: {
  name: string;
  webhookUrl: string;
  filters: JobFilterSnapshot;
}): Promise<SavedAlert> {
  const sql = getSql();
  if (!sql) {
    throw new Error("Database is not configured.");
  }

  await ensureSchema();
  const name = input.name.trim();
  const webhookUrl = input.webhookUrl.trim();
  if (!name) {
    throw new Error("Alert name is required.");
  }
  if (!webhookUrl) {
    throw new Error("Webhook URL is required.");
  }

  let parsedWebhook: URL;
  try {
    parsedWebhook = new URL(webhookUrl);
  } catch {
    throw new Error("Webhook URL is invalid.");
  }

  if (parsedWebhook.protocol !== "https:") {
    throw new Error("Webhook URL must use HTTPS.");
  }

  const filters = sanitizeAlertFilters(input.filters);
  const [row] = await sql<SavedAlertRow[]>`
    insert into saved_alerts (
      name,
      webhook_url,
      role_type,
      work_mode,
      seniority,
      location_query,
      tech_query,
      salary_min,
      updated_at
    )
    values (
      ${name},
      ${parsedWebhook.toString()},
      ${filters.roleType ?? null},
      ${filters.workMode ?? null},
      ${filters.seniority ?? null},
      ${filters.locationQuery ?? null},
      ${filters.techQuery ?? null},
      ${filters.salaryMin ?? null},
      now()
    )
    returning
      id,
      name,
      webhook_url,
      role_type,
      work_mode,
      seniority,
      location_query,
      tech_query,
      salary_min,
      created_at,
      updated_at
  `;

  return mapSavedAlertRow(row);
}

export async function deleteSavedAlert(alertId: number): Promise<boolean> {
  const sql = getSql();
  if (!sql) {
    return false;
  }

  await ensureSchema();
  const result = await sql`
    delete from saved_alerts
    where id = ${alertId}
  `;

  return (result.count ?? 0) > 0;
}

function doesJobMatchFilters(job: Job, filters: JobFilterSnapshot) {
  if (filters.roleType && job.roleType !== filters.roleType) {
    return false;
  }
  if (filters.workMode && job.workMode !== filters.workMode) {
    return false;
  }
  if (filters.seniority && job.seniority !== filters.seniority) {
    return false;
  }
  if (filters.salaryMin && (!job.salaryMin || job.salaryMin < filters.salaryMin)) {
    return false;
  }
  if (
    filters.locationQuery &&
    !job.location.toLowerCase().includes(filters.locationQuery.toLowerCase())
  ) {
    return false;
  }
  if (
    filters.techQuery &&
    !job.technologies.some((technology) =>
      technology.toLowerCase().includes(filters.techQuery!.toLowerCase()),
    )
  ) {
    return false;
  }

  return true;
}

interface JobForAlertRow {
  id: string;
  source: Job["source"];
  source_job_id: string;
  source_url: string;
  apply_url: string | null;
  title: string;
  company: string;
  location_raw: string;
  role_type: Job["roleType"];
  work_mode: Job["workMode"];
  seniority: Job["seniority"];
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  posted_at: string;
  technologies: string[];
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
}

function mapAlertJob(row: JobForAlertRow): Job {
  return {
    id: `${row.source}:${row.source_job_id}`,
    title: row.title,
    company: row.company,
    location: row.location_raw,
    roleType: row.role_type,
    seniority: row.seniority,
    salaryMin: row.salary_min ?? undefined,
    salaryMax: row.salary_max ?? undefined,
    salaryCurrency: row.salary_currency ?? undefined,
    postedAt: row.posted_at,
    technologies: row.technologies ?? [],
    workMode: row.work_mode,
    source: row.source,
    sourceUrl: row.source_url,
    applyUrl: row.apply_url ?? undefined,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    isActive: row.is_active,
  };
}

export async function dispatchAlertsForNewJobs(runStartedAt: string) {
  const sql = getSql();
  if (!sql) {
    return { attempted: 0, sent: 0, failed: 0, matchedJobs: 0 };
  }

  await ensureSchema();

  const [alerts, jobRows] = await Promise.all([
    listSavedAlerts(),
    sql<JobForAlertRow[]>`
      select
        jobs.id,
        jobs.source,
        jobs.source_job_id,
        jobs.source_url,
        jobs.apply_url,
        jobs.title,
        companies.name as company,
        jobs.location_raw,
        jobs.role_type,
        jobs.work_mode,
        jobs.seniority,
        jobs.salary_min,
        jobs.salary_max,
        jobs.salary_currency,
        jobs.posted_at,
        jobs.technologies,
        jobs.first_seen_at,
        jobs.last_seen_at,
        jobs.is_active
      from jobs
      inner join companies on companies.id = jobs.company_id
      where jobs.is_active = true
        and jobs.first_seen_at >= ${runStartedAt}
      order by jobs.first_seen_at desc
    `,
  ]);

  const jobs = jobRows.map((row) => ({
    internalId: Number(row.id),
    job: mapAlertJob(row),
  }));

  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let matchedJobs = 0;

  for (const alert of alerts) {
    const matched = jobs.filter((entry) =>
      doesJobMatchFilters(entry.job, alert.filters),
    );
    if (matched.length === 0) {
      continue;
    }

    matchedJobs += matched.length;
    attempted += 1;

    let status: "sent" | "failed" = "sent";
    let errorMessage: string | null = null;

    try {
      const response = await fetch(alert.webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          alert: {
            id: alert.id,
            name: alert.name,
            filters: alert.filters,
          },
          sentAt: new Date().toISOString(),
          matchCount: matched.length,
          jobs: matched.map((entry) => entry.job),
        }),
      });

      if (!response.ok) {
        status = "failed";
        errorMessage = `Webhook returned ${response.status}`;
      }
    } catch (error) {
      status = "failed";
      errorMessage = error instanceof Error ? error.message : "Unknown webhook error";
    }

    for (const entry of matched) {
      await sql`
        insert into alert_notifications (
          alert_id,
          job_id,
          sent_at,
          delivery_status,
          error_message
        )
        values (
          ${alert.id},
          ${entry.internalId},
          now(),
          ${status},
          ${errorMessage}
        )
        on conflict (alert_id, job_id)
        do nothing
      `;
    }

    if (status === "sent") {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return { attempted, sent, failed, matchedJobs };
}

export async function syncCompanySources(
  sources: CompanySourceConfig[],
): Promise<Map<string, number>> {
  const sql = getSql();
  if (!sql) {
    return new Map();
  }

  await ensureSchema();

  const idBySlug = new Map<string, number>();
  for (const source of sources) {
    const [row] = await sql<{ id: number }[]>`
      insert into companies (slug, name, provider, board_token, enabled, hq_location, updated_at)
      values (
        ${source.slug},
        ${source.companyName},
        ${source.provider},
        ${source.boardToken},
        ${source.enabled},
        ${source.hqLocation ?? null},
        now()
      )
      on conflict (slug)
      do update set
        name = excluded.name,
        provider = excluded.provider,
        board_token = excluded.board_token,
        enabled = excluded.enabled,
        hq_location = excluded.hq_location,
        updated_at = now()
      returning id
    `;

    idBySlug.set(source.slug, row.id);
  }

  return idBySlug;
}

export async function createIngestRun(input: {
  provider: string;
  companyId?: number;
}) {
  const sql = getSql();
  if (!sql) {
    return null;
  }

  await ensureSchema();
  const [row] = await sql<{ id: number }[]>`
    insert into ingest_runs (status, provider, company_id)
    values ('running', ${input.provider}, ${input.companyId ?? null})
    returning id
  `;
  return row.id;
}

export async function finalizeIngestRun(
  runId: number,
  input: {
    status: "success" | "failed";
    fetchedCount?: number;
    upsertedCount?: number;
    deactivatedCount?: number;
    errorMessage?: string;
  },
) {
  const sql = getSql();
  if (!sql) {
    return;
  }

  await sql`
    update ingest_runs
    set
      status = ${input.status},
      finished_at = now(),
      fetched_count = ${input.fetchedCount ?? 0},
      upserted_count = ${input.upsertedCount ?? 0},
      deactivated_count = ${input.deactivatedCount ?? 0},
      error_message = ${input.errorMessage ?? null}
    where id = ${runId}
  `;
}

export async function upsertJobs(
  companyId: number,
  source: string,
  jobs: NormalizedJobRecord[],
): Promise<{ upsertedCount: number; deactivatedCount: number }> {
  const sql = getSql();
  if (!sql) {
    return { upsertedCount: 0, deactivatedCount: 0 };
  }

  await ensureSchema();

  const sourceIds = jobs.map((job) => job.sourceJobId);
  let upsertedCount = 0;

  for (const job of jobs) {
    await sql`
      insert into jobs (
        company_id,
        source,
        source_job_id,
        source_url,
        apply_url,
        title,
        location_raw,
        role_type,
        work_mode,
        seniority,
        salary_min,
        salary_max,
        salary_currency,
        technologies,
        posted_at,
        last_seen_at,
        is_active,
        missing_runs,
        description_plain,
        updated_at
      )
      values (
        ${companyId},
        ${source},
        ${job.sourceJobId},
        ${job.sourceUrl},
        ${job.applyUrl ?? null},
        ${job.title},
        ${job.locationRaw},
        ${job.roleType},
        ${job.workMode},
        ${job.seniority},
        ${job.salaryMin ?? null},
        ${job.salaryMax ?? null},
        ${job.salaryCurrency ?? null},
        ${sql.json(job.technologies)},
        ${job.postedAt},
        now(),
        true,
        0,
        ${job.descriptionPlain},
        now()
      )
      on conflict (company_id, source_job_id)
      do update set
        source = excluded.source,
        source_url = excluded.source_url,
        apply_url = excluded.apply_url,
        title = excluded.title,
        location_raw = excluded.location_raw,
        role_type = excluded.role_type,
        work_mode = excluded.work_mode,
        seniority = excluded.seniority,
        salary_min = excluded.salary_min,
        salary_max = excluded.salary_max,
        salary_currency = excluded.salary_currency,
        technologies = excluded.technologies,
        posted_at = excluded.posted_at,
        last_seen_at = now(),
        is_active = true,
        missing_runs = 0,
        description_plain = excluded.description_plain,
        updated_at = now()
    `;
    upsertedCount += 1;
  }

  const deactivationResult = sourceIds.length
    ? await sql<{ count: number }[]>`
        with bumped as (
          update jobs
          set
            missing_runs = missing_runs + 1,
            is_active = case when missing_runs + 1 >= 2 then false else is_active end,
            updated_at = now()
          where company_id = ${companyId}
            and source = ${source}
            and source_job_id not in ${sql(sourceIds)}
          returning is_active
        )
        select count(*)::int as count
        from bumped
        where is_active = false
      `
    : [{ count: 0 }];

  return {
    upsertedCount,
    deactivatedCount: deactivationResult[0]?.count ?? 0,
  };
}

export async function getJobsResponse(): Promise<JobsResponse> {
  const sql = getSql();
  if (!sql) {
    return {
      jobs: getSampleJobs(),
      fetchedAt: new Date().toISOString(),
      mode: "sample",
      providers: ["greenhouse", "lever", "ashby"],
    };
  }

  await ensureSchema();

  const rows = await sql<
    Array<{
      source: Job["source"];
      source_job_id: string;
      source_url: string;
      apply_url: string | null;
      title: string;
      company: string;
      location_raw: string;
      role_type: Job["roleType"];
      work_mode: Job["workMode"];
      seniority: Job["seniority"];
      salary_min: number | null;
      salary_max: number | null;
      salary_currency: string | null;
      posted_at: string;
      technologies: string[];
      first_seen_at: string;
      last_seen_at: string;
      is_active: boolean;
    }>
  >`
    select
      jobs.source,
      jobs.source_job_id,
      jobs.source_url,
      jobs.apply_url,
      jobs.title,
      companies.name as company,
      jobs.location_raw,
      jobs.role_type,
      jobs.work_mode,
      jobs.seniority,
      jobs.salary_min,
      jobs.salary_max,
      jobs.salary_currency,
      jobs.posted_at,
      jobs.technologies,
      jobs.first_seen_at,
      jobs.last_seen_at,
      jobs.is_active
    from jobs
    inner join companies on companies.id = jobs.company_id
    where jobs.is_active = true
    order by jobs.posted_at desc
  `;

  const [latestRun] = await sql<{ fetched_at: string | null }[]>`
    select finished_at as fetched_at
    from ingest_runs
    where status = 'success'
    order by finished_at desc
    limit 1
  `;

  return {
    jobs: rows.map((row) => ({
      id: `${row.source}:${row.source_job_id}`,
      title: row.title,
      company: row.company,
      location: row.location_raw,
      roleType: row.role_type,
      seniority: row.seniority,
      salaryMin: row.salary_min ?? undefined,
      salaryMax: row.salary_max ?? undefined,
      salaryCurrency: row.salary_currency ?? undefined,
      postedAt: row.posted_at,
      technologies: row.technologies ?? [],
      workMode: row.work_mode,
      source: row.source,
      sourceUrl: row.source_url,
      applyUrl: row.apply_url ?? undefined,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      isActive: row.is_active,
    })),
    fetchedAt: latestRun?.fetched_at ?? new Date().toISOString(),
    mode: "live",
    providers: ["greenhouse", "lever", "ashby"],
  };
}
