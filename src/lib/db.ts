import postgres from "postgres";
import sampleJobs from "../../data/jobs-sample.json";
import type { CompanySourceConfig } from "@/lib/company-sources";
import type { Job, JobsResponse } from "@/lib/jobs";
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
