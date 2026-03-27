import { getCompanySources } from "@/lib/company-sources";
import {
  createIngestRun,
  ensureSchema,
  finalizeIngestRun,
  hasDatabase,
  syncCompanySources,
  upsertJobs,
} from "@/lib/db";
import { fetchSourceJobs } from "@/lib/providers";

export interface IngestSummary {
  sourcesProcessed: number;
  fetchedCount: number;
  upsertedCount: number;
  deactivatedCount: number;
  mode: "live" | "sample";
  errors: Array<{ source: string; message: string }>;
}

export async function ingestAllSources(): Promise<IngestSummary> {
  if (!hasDatabase()) {
    return {
      sourcesProcessed: 0,
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
    };
  }

  await ensureSchema();
  const sources = getCompanySources().filter((source) => source.enabled);
  const companyIds = await syncCompanySources(sources);

  const summary: IngestSummary = {
    sourcesProcessed: 0,
    fetchedCount: 0,
    upsertedCount: 0,
    deactivatedCount: 0,
    mode: "live",
    errors: [],
  };

  for (const source of sources) {
    const companyId = companyIds.get(source.slug);
    if (!companyId) {
      continue;
    }

    const runId = await createIngestRun({
      provider: source.provider,
      companyId,
    });

    try {
      const jobs = await fetchSourceJobs(source);
      const result = await upsertJobs(companyId, source.provider, jobs);

      summary.sourcesProcessed += 1;
      summary.fetchedCount += jobs.length;
      summary.upsertedCount += result.upsertedCount;
      summary.deactivatedCount += result.deactivatedCount;

      if (runId) {
        await finalizeIngestRun(runId, {
          status: "success",
          fetchedCount: jobs.length,
          upsertedCount: result.upsertedCount,
          deactivatedCount: result.deactivatedCount,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown ingest failure";

      summary.errors.push({
        source: source.slug,
        message,
      });

      if (runId) {
        await finalizeIngestRun(runId, {
          status: "failed",
          errorMessage: message,
        });
      }
    }
  }

  return summary;
}
