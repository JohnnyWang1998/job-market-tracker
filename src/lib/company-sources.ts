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

export function getCompanySources(): CompanySourceConfig[] {
  const raw = process.env.JOB_SOURCES_JSON;
  if (!raw) {
    return defaultSources;
  }

  try {
    const parsed = JSON.parse(raw) as CompanySourceConfig[];
    return parsed.length > 0 ? parsed : defaultSources;
  } catch {
    return defaultSources;
  }
}
