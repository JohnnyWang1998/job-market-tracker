export type RoleType = "swe" | "data";

export type WorkMode = "remote" | "hybrid" | "onsite";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  roleType: RoleType;
  seniority: "junior" | "mid" | "senior";
  salaryMin?: number;
  salaryMax?: number;
  postedAt: string; // ISO date string
  technologies: string[];
  workMode: WorkMode;
}

