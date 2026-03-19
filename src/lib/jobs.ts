export type RoleType = "swe" | "data";

export type WorkMode = "remote" | "hybrid" | "onsite";

export type JobSource = "greenhouse" | "lever" | "ashby";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  roleType: RoleType;
  seniority: "junior" | "mid" | "senior";
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
