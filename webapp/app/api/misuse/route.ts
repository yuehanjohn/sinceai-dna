import { NextRequest, NextResponse } from "next/server";
import { STRIKE_LIMIT, STRIKE_WINDOW_DAYS } from "@/lib/shield/misuse";
import { readState, resetStore, standingOf } from "@/lib/shield/store";
import { DEMO_ACTOR_ID } from "@/lib/shield/types";

export const dynamic = "force-dynamic";

/** GET /api/misuse — the demo account's standing, its reports and every drafted removal notice. */
export async function GET() {
  const s = await readState();
  const myReports = s.reports
    .filter((r) => r.reporterId === DEMO_ACTOR_ID)
    .map((r) => ({
      id: r.id,
      number: r.number,
      eventId: r.eventId,
      createdAt: r.createdAt,
      riskLevel: r.riskLevel,
      verified: r.verified,
      voidedAt: r.voidedAt,
      draftKinds: r.drafts.map((d) => d.kind),
    }));
  return NextResponse.json({
    standing: standingOf(s, DEMO_ACTOR_ID),
    strikeLimit: STRIKE_LIMIT,
    strikeWindowDays: STRIKE_WINDOW_DAYS,
    reports: myReports,
    notices: s.notices,
  });
}

/**
 * POST /api/misuse
 * Body: { action: "reset" } — demo reset, wipes the store back to a clean state.
 * Misuse itself is not a client action: strikes come only from partner outcomes
 * (POST /api/partners with outcome "legitimate").
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body?.action !== "reset") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
    await resetStore();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Bad request" }, { status: 400 });
  }
}
