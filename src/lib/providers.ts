import type { CompanySourceConfig } from "@/lib/company-sources";
import type { JobSource, RoleType, WorkMode } from "@/lib/jobs";
import {
  extractTechnologies,
  inferRoleType,
  inferSeniority,
  inferWorkMode,
  parseSalaryFromText,
  stripHtml,
} from "@/lib/job-normalize";

export interface NormalizedJobRecord {
  source: JobSource;
  sourceJobId: string;
  sourceUrl: string;
  applyUrl?: string;
  title: string;
  company: string;
  locationRaw: string;
  roleType: RoleType;
  seniority: "junior" | "mid" | "senior";
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  postedAt: string;
  technologies: string[];
  workMode: WorkMode;
  descriptionPlain: string;
}

function toRoleType(text: string): RoleType | null {
  return inferRoleType(text);
}

function toNormalizedJob(
  source: JobSource,
  title: string,
  company: string,
  locationRaw: string,
  sourceJobId: string,
  sourceUrl: string,
  postedAt: string,
  descriptionPlain: string,
  explicitWorkMode?: string | null,
  applyUrl?: string,
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  },
): NormalizedJobRecord | null {
  const combinedText = `${title} ${descriptionPlain}`;
  const roleType = toRoleType(combinedText);
  if (!roleType) {
    return null;
  }

  return {
    source,
    sourceJobId,
    sourceUrl,
    applyUrl,
    title,
    company,
    locationRaw,
    roleType,
    seniority: inferSeniority(title),
    salaryMin: salary?.min,
    salaryMax: salary?.max,
    salaryCurrency: salary?.currency,
    postedAt,
    technologies: extractTechnologies(combinedText),
    workMode: inferWorkMode(`${locationRaw} ${descriptionPlain}`, explicitWorkMode),
    descriptionPlain,
  };
}

export async function fetchSourceJobs(
  sourceConfig: CompanySourceConfig,
): Promise<NormalizedJobRecord[]> {
  switch (sourceConfig.provider) {
    case "greenhouse":
      return fetchGreenhouseJobs(sourceConfig);
    case "lever":
      return fetchLeverJobs(sourceConfig);
    case "ashby":
      return fetchAshbyJobs(sourceConfig);
  }
}

async function fetchGreenhouseJobs(
  sourceConfig: CompanySourceConfig,
): Promise<NormalizedJobRecord[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${sourceConfig.boardToken}/jobs?content=true`;
  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error(
      `Greenhouse request failed for ${sourceConfig.slug}: ${response.status}`,
    );
  }

  const json = (await response.json()) as {
    jobs: Array<{
      id: number;
      absolute_url: string;
      company_name: string;
      title: string;
      content?: string;
      first_published?: string;
      updated_at?: string;
      location?: { name?: string };
    }>;
  };

  return json.jobs
    .map((job) => {
      const descriptionPlain = stripHtml(job.content);
      const salary = parseSalaryFromText(descriptionPlain);
      return toNormalizedJob(
        "greenhouse",
        job.title,
        job.company_name || sourceConfig.companyName,
        job.location?.name ?? sourceConfig.hqLocation ?? "Unknown",
        String(job.id),
        job.absolute_url,
        job.first_published ?? job.updated_at ?? new Date().toISOString(),
        descriptionPlain,
        undefined,
        job.absolute_url,
        salary,
      );
    })
    .filter((job): job is NormalizedJobRecord => job !== null);
}

async function fetchLeverJobs(
  sourceConfig: CompanySourceConfig,
): Promise<NormalizedJobRecord[]> {
  const url = `https://api.lever.co/v0/postings/${sourceConfig.boardToken}?mode=json`;
  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error(
      `Lever request failed for ${sourceConfig.slug}: ${response.status}`,
    );
  }

  const jobs = (await response.json()) as Array<{
    id: string;
    text: string;
    hostedUrl: string;
    applyUrl: string;
    descriptionPlain?: string;
    categories?: {
      location?: string;
      team?: string;
      department?: string;
    };
    createdAt?: number;
    workplaceType?: string;
    salaryRange?: {
      min?: number;
      max?: number;
      currency?: string;
    };
  }>;

  return jobs
    .map((job) => {
      const descriptionPlain = job.descriptionPlain ?? "";
      return toNormalizedJob(
        "lever",
        job.text,
        sourceConfig.companyName,
        job.categories?.location ?? sourceConfig.hqLocation ?? "Unknown",
        job.id,
        job.hostedUrl,
        job.createdAt
          ? new Date(job.createdAt).toISOString()
          : new Date().toISOString(),
        descriptionPlain,
        job.workplaceType,
        job.applyUrl,
        {
          min: job.salaryRange?.min,
          max: job.salaryRange?.max,
          currency: job.salaryRange?.currency,
        },
      );
    })
    .filter((job): job is NormalizedJobRecord => job !== null);
}

async function fetchAshbyJobs(
  sourceConfig: CompanySourceConfig,
): Promise<NormalizedJobRecord[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${sourceConfig.boardToken}?includeCompensation=true`;
  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error(
      `Ashby request failed for ${sourceConfig.slug}: ${response.status}`,
    );
  }

  const json = (await response.json()) as {
    jobs: Array<{
      id: string;
      title: string;
      location?: string;
      publishedAt?: string;
      jobUrl: string;
      applyUrl?: string;
      descriptionPlain?: string;
      descriptionHtml?: string;
      workplaceType?: string | null;
      isRemote?: boolean | null;
      compensation?: {
        summaryComponents?: Array<{
          compensationType?: string;
          currencyCode?: string;
          minValue?: number | null;
          maxValue?: number | null;
        }>;
      };
    }>;
  };

  return json.jobs
    .map((job) => {
      const descriptionPlain =
        job.descriptionPlain ?? stripHtml(job.descriptionHtml);
      const salaryComponent = job.compensation?.summaryComponents?.find(
        (component) => component.compensationType === "Salary",
      );

      return toNormalizedJob(
        "ashby",
        job.title,
        sourceConfig.companyName,
        job.location ?? sourceConfig.hqLocation ?? "Unknown",
        job.id,
        job.jobUrl,
        job.publishedAt ?? new Date().toISOString(),
        descriptionPlain,
        job.isRemote ? "remote" : job.workplaceType,
        job.applyUrl,
        {
          min: salaryComponent?.minValue ?? undefined,
          max: salaryComponent?.maxValue ?? undefined,
          currency: salaryComponent?.currencyCode ?? undefined,
        },
      );
    })
    .filter((job): job is NormalizedJobRecord => job !== null);
}
