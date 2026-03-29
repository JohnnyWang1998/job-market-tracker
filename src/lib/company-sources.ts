import fs from "node:fs";
import path from "node:path";
import type { JobSource } from "@/lib/jobs";

export type SourcePriorityTier = "high" | "medium" | "low";
export type SourceIngestCadence = "twice_daily" | "daily" | "weekly";

export interface CompanySourceConfig {
  slug: string;
  companyName: string;
  provider: JobSource;
  boardToken: string;
  enabled: boolean;
  hqLocation?: string;
  priorityTier?: SourcePriorityTier;
  ingestCadence?: SourceIngestCadence;
  owner?: string;
  notes?: string;
}

export interface SourceConfigIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  sourceSlug?: string;
}

export interface SourceConfigValidationResult {
  mode:
    | "default"
    | "registry_file"
    | "env_override"
    | "registry_plus_env_append";
  registryPath?: string;
  sources: CompanySourceConfig[];
  issues: SourceConfigIssue[];
}

const defaultSources: CompanySourceConfig[] = [
  {
    slug: "stripe",
    companyName: "Stripe",
    provider: "greenhouse",
    boardToken: "stripe",
    enabled: true,
    hqLocation: "San Francisco, CA",
    priorityTier: "high",
    ingestCadence: "daily",
  },
  {
    slug: "vercel",
    companyName: "Vercel",
    provider: "greenhouse",
    boardToken: "vercel",
    enabled: true,
    hqLocation: "San Francisco, CA",
    priorityTier: "medium",
    ingestCadence: "daily",
  },
  {
    slug: "plaid",
    companyName: "Plaid",
    provider: "lever",
    boardToken: "plaid",
    enabled: true,
    hqLocation: "San Francisco, CA",
    priorityTier: "medium",
    ingestCadence: "daily",
  },
  {
    slug: "openai",
    companyName: "OpenAI",
    provider: "ashby",
    boardToken: "openai",
    enabled: true,
    hqLocation: "San Francisco, CA",
    priorityTier: "high",
    ingestCadence: "daily",
  },
];

function isJobSource(value: unknown): value is JobSource {
  return value === "greenhouse" || value === "lever" || value === "ashby";
}

function isPriorityTier(value: unknown): value is SourcePriorityTier {
  return value === "high" || value === "medium" || value === "low";
}

function isIngestCadence(value: unknown): value is SourceIngestCadence {
  return value === "twice_daily" || value === "daily" || value === "weekly";
}

function validateAndNormalizeSources(
  raw: unknown,
  label: string,
): { sources: CompanySourceConfig[]; issues: SourceConfigIssue[] } {
  const issues: SourceConfigIssue[] = [];
  if (!Array.isArray(raw)) {
    return {
      sources: [],
      issues: [
        {
          level: "error",
          code: "invalid_shape",
          message: `${label} must be a JSON array of source objects.`,
        },
      ],
    };
  }

  const sources: CompanySourceConfig[] = [];
  const seenSlugs = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      issues.push({
        level: "error",
        code: "invalid_entry",
        message: `${label} contains a non-object source entry.`,
      });
      continue;
    }

    const record = item as Record<string, unknown>;
    const slug = typeof record.slug === "string" ? record.slug.trim() : "";
    const companyName =
      typeof record.companyName === "string" ? record.companyName.trim() : "";
    const boardToken =
      typeof record.boardToken === "string" ? record.boardToken.trim() : "";

    if (!slug) {
      issues.push({
        level: "error",
        code: "missing_slug",
        message: `${label} contains an entry missing slug.`,
      });
      continue;
    }

    if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(slug)) {
      issues.push({
        level: "error",
        code: "invalid_slug",
        message:
          `${label} source slug "${slug}" must match ^[a-z0-9][a-z0-9-]{1,63}$.`,
        sourceSlug: slug,
      });
      continue;
    }

    if (seenSlugs.has(slug)) {
      issues.push({
        level: "error",
        code: "duplicate_slug",
        message: `${label} includes duplicate slug "${slug}".`,
        sourceSlug: slug,
      });
      continue;
    }

    if (!companyName) {
      issues.push({
        level: "error",
        code: "missing_company_name",
        message: `${label} source "${slug}" is missing companyName.`,
        sourceSlug: slug,
      });
      continue;
    }

    if (!isJobSource(record.provider)) {
      issues.push({
        level: "error",
        code: "invalid_provider",
        message: `${label} source "${slug}" has invalid provider.`,
        sourceSlug: slug,
      });
      continue;
    }

    if (!boardToken) {
      issues.push({
        level: "error",
        code: "missing_board_token",
        message: `${label} source "${slug}" is missing boardToken.`,
        sourceSlug: slug,
      });
      continue;
    }

    const enabled =
      typeof record.enabled === "boolean" ? record.enabled : true;

    let priorityTier: SourcePriorityTier = "medium";
    if (record.priorityTier !== undefined) {
      if (!isPriorityTier(record.priorityTier)) {
        issues.push({
          level: "error",
          code: "invalid_priority_tier",
          message:
            `${label} source "${slug}" has invalid priorityTier (allowed: high|medium|low).`,
          sourceSlug: slug,
        });
        continue;
      }
      priorityTier = record.priorityTier;
    }

    let ingestCadence: SourceIngestCadence = "daily";
    if (record.ingestCadence !== undefined) {
      if (!isIngestCadence(record.ingestCadence)) {
        issues.push({
          level: "error",
          code: "invalid_ingest_cadence",
          message:
            `${label} source "${slug}" has invalid ingestCadence (allowed: twice_daily|daily|weekly).`,
          sourceSlug: slug,
        });
        continue;
      }
      ingestCadence = record.ingestCadence;
    }

    const source: CompanySourceConfig = {
      slug,
      companyName,
      provider: record.provider,
      boardToken,
      enabled,
      priorityTier,
      ingestCadence,
    };

    if (typeof record.hqLocation === "string" && record.hqLocation.trim()) {
      source.hqLocation = record.hqLocation.trim();
    }
    if (typeof record.owner === "string" && record.owner.trim()) {
      source.owner = record.owner.trim();
    }
    if (typeof record.notes === "string" && record.notes.trim()) {
      source.notes = record.notes.trim();
    }

    sources.push(source);
    seenSlugs.add(slug);
  }

  return { sources, issues };
}

function parseJsonSources(
  raw: string,
  label: string,
): { sources: CompanySourceConfig[]; issues: SourceConfigIssue[] } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return validateAndNormalizeSources(parsed, label);
  } catch {
    return {
      sources: [],
      issues: [
        {
          level: "error",
          code: "invalid_json",
          message: `${label} contains invalid JSON.`,
        },
      ],
    };
  }
}

function loadRegistryFile(): {
  mode: "default" | "registry_file";
  registryPath?: string;
  sources: CompanySourceConfig[];
  issues: SourceConfigIssue[];
} {
  const registryPath =
    process.env.JOB_SOURCES_REGISTRY_PATH ??
    path.join(process.cwd(), "data", "source-registry.json");

  if (!fs.existsSync(registryPath)) {
    return {
      mode: "default",
      registryPath,
      sources: defaultSources,
      issues: [
        {
          level: "warning",
          code: "registry_file_missing",
          message: `Source registry file not found at ${registryPath}; using built-in defaults.`,
        },
      ],
    };
  }

  try {
    const raw = fs.readFileSync(registryPath, "utf8");
    const parsed = parseJsonSources(raw, `Registry file ${registryPath}`);
    if (parsed.sources.length === 0 && parsed.issues.some((i) => i.level === "error")) {
      return {
        mode: "registry_file",
        registryPath,
        sources: [],
        issues: parsed.issues,
      };
    }

    return {
      mode: "registry_file",
      registryPath,
      sources: parsed.sources,
      issues: parsed.issues,
    };
  } catch {
    return {
      mode: "registry_file",
      registryPath,
      sources: [],
      issues: [
        {
          level: "error",
          code: "registry_read_failed",
          message: `Failed to read source registry file at ${registryPath}.`,
        },
      ],
    };
  }
}

function mergeBySlug(
  base: CompanySourceConfig[],
  append: CompanySourceConfig[],
): CompanySourceConfig[] {
  const deduped = new Map<string, CompanySourceConfig>();
  for (const source of base) {
    deduped.set(source.slug, source);
  }
  for (const source of append) {
    deduped.set(source.slug, source);
  }
  return [...deduped.values()];
}

export function getCompanySourcesValidation(): SourceConfigValidationResult {
  const overrideRaw = process.env.JOB_SOURCES_JSON;
  const appendRaw = process.env.JOB_SOURCES_APPEND_JSON;

  if (overrideRaw) {
    const parsed = parseJsonSources(overrideRaw, "JOB_SOURCES_JSON");
    return {
      mode: "env_override",
      sources: parsed.sources,
      issues: parsed.issues,
    };
  }

  const registry = loadRegistryFile();

  if (!appendRaw) {
    return {
      mode: registry.mode,
      registryPath: registry.registryPath,
      sources: registry.sources,
      issues: registry.issues,
    };
  }

  const appended = parseJsonSources(appendRaw, "JOB_SOURCES_APPEND_JSON");
  return {
    mode: "registry_plus_env_append",
    registryPath: registry.registryPath,
    sources: mergeBySlug(registry.sources, appended.sources),
    issues: [...registry.issues, ...appended.issues],
  };
}

export function getCompanySources(): CompanySourceConfig[] {
  const validation = getCompanySourcesValidation();
  const errors = validation.issues.filter((issue) => issue.level === "error");

  if (errors.length > 0) {
    const summary = errors
      .slice(0, 6)
      .map((issue) => `${issue.code}: ${issue.message}`)
      .join("; ");
    throw new Error(`Source configuration validation failed: ${summary}`);
  }

  if (validation.sources.length === 0) {
    throw new Error("Source configuration is empty after validation.");
  }

  return validation.sources;
}
