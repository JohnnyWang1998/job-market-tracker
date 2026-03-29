import { getCompanySources } from "@/lib/company-sources";
import {
  createIngestRun,
  ensureSchema,
  finalizeIngestRun,
  getSourceIngestGate,
  hasDatabase,
  syncCompanySources,
  upsertJobs,
} from "@/lib/db";
import { fetchSourceJobs } from "@/lib/providers";
import type { CompanySourceConfig } from "@/lib/company-sources";

type IngestErrorCategory =
  | "auto_disabled"
  | "network"
  | "rate_limit"
  | "provider_4xx"
  | "provider_5xx"
  | "parse_error"
  | "db_error"
  | "unknown";

interface SourceIngestResult {
  source: string;
  provider: CompanySourceConfig["provider"];
  status: "success" | "failed" | "skipped";
  fetchedCount: number;
  upsertedCount: number;
  deactivatedCount: number;
  attemptCount: number;
  durationMs: number;
  errorCategory?: IngestErrorCategory;
  errorMessage?: string;
  skipReason?: string;
}

class RetryAttemptsExceededError extends Error {
  attemptCount: number;
  causeError: unknown;

  constructor(message: string, attemptCount: number, causeError: unknown) {
    super(message);
    this.name = "RetryAttemptsExceededError";
    this.attemptCount = attemptCount;
    this.causeError = causeError;
  }
}

export interface IngestSummary {
  sourcesProcessed: number;
  skippedCount: number;
  fetchedCount: number;
  upsertedCount: number;
  deactivatedCount: number;
  mode: "live" | "sample";
  errors: Array<{ source: string; message: string }>;
  sourceResults: SourceIngestResult[];
}

function parsePositiveInt(raw: string | undefined, fallback: number) {
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown ingest failure";
}

function classifyError(error: unknown): IngestErrorCategory {
  const message = toErrorMessage(error).toLowerCase();
  const statusMatch = message.match(/\b([45]\d{2})\b/);
  const statusCode = statusMatch ? Number.parseInt(statusMatch[1], 10) : NaN;
  if (message.includes("request failed") || message.includes("fetch failed")) {
    if (statusCode === 429 || message.includes("429")) {
      return "rate_limit";
    }
    if (statusCode >= 400 && statusCode < 500) {
      return "provider_4xx";
    }
    if (statusCode >= 500 && statusCode < 600) {
      return "provider_5xx";
    }
    return "network";
  }
  if (message.includes("parse") || message.includes("json")) {
    return "parse_error";
  }
  if (message.includes("db") || message.includes("sql") || message.includes("postgres")) {
    return "db_error";
  }
  return "unknown";
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withRetry<T>(
  task: () => Promise<T>,
  maxAttempts: number,
  baseBackoffMs: number,
): Promise<{ value: T; attemptCount: number }> {
  let lastError: unknown;
  let attemptsUsed = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attemptsUsed = attempt;
    try {
      return { value: await task(), attemptCount: attempt };
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) {
        break;
      }
      const backoff = baseBackoffMs * 2 ** (attempt - 1);
      await sleep(backoff);
    }
  }

  throw new RetryAttemptsExceededError(
    "Maximum fetch retry attempts exceeded",
    attemptsUsed,
    lastError,
  );
}

async function runWithConcurrency<TInput, TResult>(
  items: TInput[],
  limit: number,
  worker: (item: TInput) => Promise<TResult>,
) {
  const results: TResult[] = [];
  let nextIndex = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const current = items[nextIndex];
      nextIndex += 1;
      results.push(await worker(current));
    }
  });

  await Promise.all(runners);
  return results;
}

export async function ingestAllSources(): Promise<IngestSummary> {
  const providerConcurrency = parsePositiveInt(
    process.env.INGEST_PROVIDER_CONCURRENCY,
    2,
  );
  const maxFetchAttempts = parsePositiveInt(process.env.INGEST_FETCH_MAX_ATTEMPTS, 3);
  const baseBackoffMs = parsePositiveInt(process.env.INGEST_FETCH_BASE_BACKOFF_MS, 750);
  const autoDisableFailureStreak = parsePositiveInt(
    process.env.INGEST_AUTO_DISABLE_FAILURE_STREAK,
    5,
  );
  const autoDisableCooldownHours = parsePositiveInt(
    process.env.INGEST_AUTO_DISABLE_COOLDOWN_HOURS,
    24,
  );

  if (!hasDatabase()) {
    return {
      sourcesProcessed: 0,
      skippedCount: 0,
      fetchedCount: 0,
      upsertedCount: 0,
      deactivatedCount: 0,
      mode: "sample",
      errors: [
        {
          source: "database",
          message: "DATABASE_URL is not configured.",
        },
      ],
      sourceResults: [],
    };
  }

  await ensureSchema();
  const sources = getCompanySources().filter((source) => source.enabled);
  const companyIds = await syncCompanySources(sources);

  const summary: IngestSummary = {
    sourcesProcessed: 0,
    skippedCount: 0,
    fetchedCount: 0,
    upsertedCount: 0,
    deactivatedCount: 0,
    mode: "live",
    errors: [],
    sourceResults: [],
  };

  const byProvider = new Map<CompanySourceConfig["provider"], CompanySourceConfig[]>();
  for (const source of sources) {
    const existing = byProvider.get(source.provider) ?? [];
    existing.push(source);
    byProvider.set(source.provider, existing);
  }

  const processSource = async (source: CompanySourceConfig): Promise<SourceIngestResult> => {
    const companyId = companyIds.get(source.slug);
    if (!companyId) {
      return {
        source: source.slug,
        provider: source.provider,
        status: "failed",
        fetchedCount: 0,
        upsertedCount: 0,
        deactivatedCount: 0,
        attemptCount: 0,
        durationMs: 0,
        errorCategory: "db_error",
        errorMessage: "Missing company ID mapping for source",
      };
    }

    const startedAt = Date.now();
    const gate = await getSourceIngestGate({
      companyId,
      failureStreakThreshold: autoDisableFailureStreak,
      cooldownHours: autoDisableCooldownHours,
    });

    const runId = await createIngestRun({
      provider: source.provider,
      companyId,
    });

    if (gate.skip) {
      const skipReason = `Auto-disabled after ${gate.consecutiveFailures} consecutive failures; cooling down for ${autoDisableCooldownHours}h`;
      if (runId) {
        await finalizeIngestRun(runId, {
          status: "skipped",
          errorMessage: skipReason,
        });
      }

      return {
        source: source.slug,
        provider: source.provider,
        status: "skipped",
        fetchedCount: 0,
        upsertedCount: 0,
        deactivatedCount: 0,
        attemptCount: 0,
        durationMs: Date.now() - startedAt,
        errorCategory: "auto_disabled",
        errorMessage: skipReason,
        skipReason,
      };
    }

    try {
      const { value: jobs, attemptCount } = await withRetry(
        () => fetchSourceJobs(source),
        maxFetchAttempts,
        baseBackoffMs,
      );
      const result = await upsertJobs(companyId, source.provider, jobs);
      const durationMs = Date.now() - startedAt;

      if (runId) {
        await finalizeIngestRun(runId, {
          status: "success",
          fetchedCount: jobs.length,
          upsertedCount: result.upsertedCount,
          deactivatedCount: result.deactivatedCount,
        });
      }

      return {
        source: source.slug,
        provider: source.provider,
        status: "success",
        fetchedCount: jobs.length,
        upsertedCount: result.upsertedCount,
        deactivatedCount: result.deactivatedCount,
        attemptCount,
        durationMs,
      };
    } catch (error) {
      const rootError =
        error instanceof RetryAttemptsExceededError ? error.causeError : error;
      const message = toErrorMessage(rootError);
      const durationMs = Date.now() - startedAt;
      const errorCategory = classifyError(rootError);
      const attemptCount =
        error instanceof RetryAttemptsExceededError
          ? error.attemptCount
          : maxFetchAttempts;

      if (runId) {
        await finalizeIngestRun(runId, {
          status: "failed",
          errorMessage: message,
        });
      }

      return {
        source: source.slug,
        provider: source.provider,
        status: "failed",
        fetchedCount: 0,
        upsertedCount: 0,
        deactivatedCount: 0,
        attemptCount,
        durationMs,
        errorCategory,
        errorMessage: message,
      };
    }
  };

  for (const provider of ["greenhouse", "lever", "ashby"] as const) {
    const providerSources = byProvider.get(provider) ?? [];
    if (providerSources.length === 0) {
      continue;
    }
    const providerResults = await runWithConcurrency(
      providerSources,
      providerConcurrency,
      processSource,
    );
    summary.sourceResults.push(...providerResults);
  }

  for (const result of summary.sourceResults) {
    summary.sourcesProcessed += 1;
    summary.fetchedCount += result.fetchedCount;
    summary.upsertedCount += result.upsertedCount;
    summary.deactivatedCount += result.deactivatedCount;
    if (result.status === "failed") {
      summary.errors.push({
        source: result.source,
        message: result.errorMessage ?? "Unknown ingest failure",
      });
    }
    if (result.status === "skipped") {
      summary.skippedCount += 1;
    }
  }

  return summary;
}
