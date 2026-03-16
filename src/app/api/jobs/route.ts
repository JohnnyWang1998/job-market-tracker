import { NextResponse } from "next/server";
import sampleJobs from "../../../../data/jobs-sample.json";
import type { Job } from "@/lib/jobs";

export async function GET() {
  const jobs = sampleJobs as Job[];

  return NextResponse.json({
    jobs,
    fetchedAt: new Date().toISOString(),
  });
}

