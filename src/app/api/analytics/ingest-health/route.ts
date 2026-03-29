import { NextRequest, NextResponse } from "next/server";
import { getIngestHealthResponse } from "@/lib/db";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret =
    process.env.INGEST_HEALTH_SECRET ?? process.env.CRON_SECRET;
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

  const hoursParam = request.nextUrl.searchParams.get("hours");
  const parsed = hoursParam ? Number.parseInt(hoursParam, 10) : 168;
  const hours = Number.isFinite(parsed) ? Math.max(1, Math.min(parsed, 24 * 90)) : 168;

  const payload = await getIngestHealthResponse(hours);
  return NextResponse.json(payload);
}
