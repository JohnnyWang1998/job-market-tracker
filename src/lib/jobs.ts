export type RoleType = "swe" | "data";

export type WorkMode = "remote" | "hybrid" | "onsite";

export type JobSource = "greenhouse" | "lever" | "ashby";

export type Seniority = "junior" | "mid" | "senior";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  roleType: RoleType;
  seniority: Seniority;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  postedAt: string; // ISO date string
  technologies: string[];
  workMode: WorkMode;
  source: JobSource;
  sourceUrl: string;
  applyUrl?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  isActive: boolean;
}

export interface JobsResponse {
  jobs: Job[];
  fetchedAt: string;
  mode?: "live" | "sample";
  providers?: JobSource[];
}

export interface SeniorityTrendPoint {
  month: string; // YYYY-MM
  junior: number;
  mid: number;
  senior: number;
}

export interface SeniorityTrendResponse {
  months: number;
  series: SeniorityTrendPoint[];
  fetchedAt: string;
  mode: "live" | "sample";
}
