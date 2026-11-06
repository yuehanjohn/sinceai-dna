import { NextRequest, NextResponse } from "next/server";

interface ShieldLogEntry {
  action: string;
  number: string;
  eventId: string;
  status: string;
  at: string;
}

// Demo-only in-memory log: survives client refresh, resets on server restart.
const LOG: ShieldLogEntry[] = [];

const ALLOWED_ACTIONS: Record<string, true> = {
  block_device: true,
  report_operator: true,
  report_traficom: true,
  evidence_pack: true,
};

/**
 * POST /api/shield
 * Body: { action: string, number: string, eventId: string }
 * Returns the logged entry with status "logged (demo)".
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "";
    const number = typeof body?.number === "string" ? body.number : "";
    const eventId = typeof body?.eventId === "string" ? body.eventId : "";
    if (!(action in ALLOWED_ACTIONS) || !number || !eventId) {
      return NextResponse.json({ error: "Missing or invalid action, number or eventId" }, { status: 400 });
    }
    const entry: ShieldLogEntry = {
      action,
      number,
      eventId,
      status: "logged (demo)",
      at: new Date().toISOString(),
    };
    LOG.push(entry);
    return NextResponse.json(entry);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Bad request" }, { status: 400 });
  }
}

/** GET /api/shield — returns the current demo log (for inspection only). */
export async function GET() {
  return NextResponse.json({ entries: LOG, note: "demo in-memory log; resets on server restart" });
}
