import { NextRequest, NextResponse } from "next/server";
import { getSeniorityTrendResponse } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const monthsParam = request.nextUrl.searchParams.get("months");
  const parsed = monthsParam ? Number(monthsParam) : 24;
  const months = Number.isFinite(parsed) ? parsed : 24;

  const payload = await getSeniorityTrendResponse(months);
  return NextResponse.json(payload);
}
