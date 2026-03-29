import { NextRequest, NextResponse } from "next/server";
import { ingestAllSources } from "@/lib/ingest";

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

  const summary = await ingestAllSources();
  const hasElevatedAlert = summary.alerts.some(
    (alert) => alert.level === "warn" || alert.level === "critical",
  );
  const status =
    summary.mode === "sample" || summary.errors.length > 0 || hasElevatedAlert
      ? 207
      : 200;

  return NextResponse.json(summary, { status });
}
