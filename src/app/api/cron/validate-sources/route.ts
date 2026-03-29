import { NextRequest, NextResponse } from "next/server";
import { getCompanySourcesValidation } from "@/lib/company-sources";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = getCompanySourcesValidation();
  const errors = validation.issues.filter((issue) => issue.level === "error");
  const warnings = validation.issues.filter((issue) => issue.level === "warning");

  const providerCounts = {
    greenhouse: 0,
    lever: 0,
    ashby: 0,
  };

  for (const source of validation.sources) {
    providerCounts[source.provider] += 1;
  }

  const sampleSources = validation.sources.slice(0, 20).map((source) => ({
    ...source,
    boardToken: "[redacted]",
  }));

  return NextResponse.json(
    {
      ok: errors.length === 0,
      mode: validation.mode,
      registryPath: validation.registryPath,
      sourceCount: validation.sources.length,
      enabledCount: validation.sources.filter((source) => source.enabled).length,
      providerCounts,
      errors,
      warnings,
      sampleSources,
    },
    { status: errors.length > 0 ? 422 : 200 },
  );
}
