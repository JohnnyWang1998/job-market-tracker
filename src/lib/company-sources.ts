import type { JobSource } from "@/lib/jobs";

export interface CompanySourceConfig {
  slug: string;
  companyName: string;
  provider: JobSource;
  boardToken: string;
  enabled: boolean;
  hqLocation?: string;
}

const defaultSources: CompanySourceConfig[] = [
  {
    slug: "stripe",
    companyName: "Stripe",
    provider: "greenhouse",
    boardToken: "stripe",
    enabled: true,
    hqLocation: "San Francisco, CA",
  },
  {
    slug: "vercel",
    companyName: "Vercel",
    provider: "greenhouse",
    boardToken: "vercel",
    enabled: true,
    hqLocation: "San Francisco, CA",
  },
  {
    slug: "plaid",
    companyName: "Plaid",
    provider: "lever",
    boardToken: "plaid",
    enabled: true,
    hqLocation: "San Francisco, CA",
  },
  {
    slug: "openai",
    companyName: "OpenAI",
    provider: "ashby",
    boardToken: "openai",
    enabled: true,
    hqLocation: "San Francisco, CA",
  },
];

function isJobSource(value: unknown): value is JobSource {
  return value === "greenhouse" || value === "lever" || value === "ashby";
}

function parseSources(raw: string): CompanySourceConfig[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    const cleaned: CompanySourceConfig[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const record = item as Record<string, unknown>;
      if (
        typeof record.slug !== "string" ||
        typeof record.companyName !== "string" ||
        !isJobSource(record.provider) ||
        typeof record.boardToken !== "string"
      ) {
        continue;
      }

      const source: CompanySourceConfig = {
        slug: record.slug,
        companyName: record.companyName,
        provider: record.provider,
        boardToken: record.boardToken,
        enabled: typeof record.enabled === "boolean" ? record.enabled : true,
      };

      if (typeof record.hqLocation === "string") {
        source.hqLocation = record.hqLocation;
      }

      cleaned.push(source);
    }

    return cleaned.length > 0 ? cleaned : null;
  } catch {
    return null;
  }
}

export function getCompanySources(): CompanySourceConfig[] {
  const overrideRaw = process.env.JOB_SOURCES_JSON;
  const appendRaw = process.env.JOB_SOURCES_APPEND_JSON;

  const overrideSources = overrideRaw ? parseSources(overrideRaw) : null;
  if (overrideSources) {
    return overrideSources;
  }

  const appendedSources = appendRaw ? parseSources(appendRaw) : null;
  if (!appendedSources) {
    return defaultSources;
  }

  const deduped = new Map<string, CompanySourceConfig>();
  for (const source of defaultSources) {
    deduped.set(source.slug, source);
  }
  for (const source of appendedSources) {
    deduped.set(source.slug, source);
  }

  return [...deduped.values()];
}
