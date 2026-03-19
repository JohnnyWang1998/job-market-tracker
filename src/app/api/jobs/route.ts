import { NextResponse } from "next/server";
import { getJobsResponse } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getJobsResponse();
  return NextResponse.json(payload);
}
