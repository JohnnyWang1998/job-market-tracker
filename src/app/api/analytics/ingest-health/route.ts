import { NextRequest, NextResponse } from "next/server";
import { getIngestHealthResponse } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const hoursParam = request.nextUrl.searchParams.get("hours");
  const parsed = hoursParam ? Number.parseInt(hoursParam, 10) : 168;
  const hours = Number.isFinite(parsed) ? Math.max(1, Math.min(parsed, 24 * 90)) : 168;

  const payload = await getIngestHealthResponse(hours);
  return NextResponse.json(payload);
}
