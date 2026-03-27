import { NextResponse } from "next/server";
import { deleteSavedAlert, hasDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: { id: string } },
) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "Alerts require DATABASE_URL." },
      { status: 400 },
    );
  }

  const parsedId = Number(context.params.id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return NextResponse.json({ error: "Invalid alert id." }, { status: 400 });
  }

  const deleted = await deleteSavedAlert(parsedId);
  if (!deleted) {
    return NextResponse.json({ error: "Alert not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
