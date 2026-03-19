import type { RoleType, WorkMode } from "@/lib/jobs";

const techKeywords = [
  "TypeScript",
  "JavaScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "SQL",
  "PostgreSQL",
  "Java",
  "Go",
  "Rust",
  "AWS",
  "GCP",
  "Azure",
  "Docker",
  "Kubernetes",
  "TensorFlow",
  "PyTorch",
  "Spark",
  "Airflow",
  "dbt",
];

const sweKeywords = [
  "software engineer",
  "frontend",
  "front-end",
  "backend",
  "back-end",
  "full stack",
  "full-stack",
  "mobile engineer",
  "ios",
  "android",
  "developer",
  "platform engineer",
  "site reliability",
  "sre",
  "devops",
  "security engineer",
];

const dataKeywords = [
  "data scientist",
  "data engineer",
  "analytics engineer",
  "machine learning",
  "ml engineer",
  "data analyst",
  "business intelligence",
  "research engineer",
  "applied scientist",
  "ai engineer",
  "quantitative",
];

export function stripHtml(html: string | null | undefined): string {
  if (!html) {
    return "";
  }

  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferRoleType(text: string): RoleType | null {
  const haystack = text.toLowerCase();
  const isData = dataKeywords.some((keyword) => haystack.includes(keyword));
  if (isData) {
    return "data";
  }

  const isSwe = sweKeywords.some((keyword) => haystack.includes(keyword));
  if (isSwe) {
    return "swe";
  }

  return null;
}

export function inferSeniority(text: string): "junior" | "mid" | "senior" {
  const haystack = text.toLowerCase();
  if (
    haystack.includes("intern") ||
    haystack.includes("new grad") ||
    haystack.includes("junior")
  ) {
    return "junior";
  }

  if (
    haystack.includes("senior") ||
    haystack.includes("staff") ||
    haystack.includes("principal") ||
    haystack.includes("lead")
  ) {
    return "senior";
  }

  return "mid";
}

export function inferWorkMode(
  text: string,
  explicit?: string | null,
): WorkMode {
  const normalized = `${explicit ?? ""} ${text}`.toLowerCase();
  if (normalized.includes("hybrid")) {
    return "hybrid";
  }

  if (normalized.includes("remote")) {
    return "remote";
  }

  return "onsite";
}

export function extractTechnologies(text: string): string[] {
  const haystack = text.toLowerCase();
  return techKeywords.filter((keyword) =>
    haystack.includes(keyword.toLowerCase()),
  );
}

export function parseSalaryFromText(text: string): {
  min?: number;
  max?: number;
  currency?: string;
} {
  const compact = text.replace(/,/g, "");
  const match = compact.match(/\$ ?(\d{2,3})k?\s*(?:-|–|to)\s*\$ ?(\d{2,3})k/i);
  if (match) {
    const minRaw = Number(match[1]);
    const maxRaw = Number(match[2]);
    const multiplier =
      minRaw < 1000 && maxRaw < 1000 && text.toLowerCase().includes("k")
        ? 1000
        : 1;

    return {
      min: minRaw * multiplier,
      max: maxRaw * multiplier,
      currency: "USD",
    };
  }

  return {};
}
