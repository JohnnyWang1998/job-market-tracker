import { NextRequest, NextResponse } from "next/server";
import { createSavedAlert, hasDatabase, listSavedAlerts } from "@/lib/db";
import type { JobFilterSnapshot } from "@/lib/jobs";

export const dynamic = "force-dynamic";

interface CreateAlertRequest {
  name?: string;
  webhookUrl?: string;
  filters?: JobFilterSnapshot;
}

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({ alerts: [], mode: "sample" as const });
  }

  const alerts = await listSavedAlerts();
  return NextResponse.json({ alerts, mode: "live" as const });
}

export async function POST(request: NextRequest) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "Alerts require DATABASE_URL." },
      { status: 400 },
    );
  }

  let body: CreateAlertRequest;
  try {
    body = (await request.json()) as CreateAlertRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const alert = await createSavedAlert({
      name: body.name ?? "",
      webhookUrl: body.webhookUrl ?? "",
      filters: body.filters ?? {},
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create alert.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
