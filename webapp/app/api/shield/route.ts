import { NextRequest, NextResponse } from "next/server";
import { decideSingleTurn } from "@/lib/engine/decide";
import { DEMO_CALL_EVENTS } from "@/lib/callEvents";
import { caseFromEvent } from "@/lib/shield/caseFromEvent";
import { draftFor } from "@/lib/shield/reports";
import { mutate, readState, standingOf } from "@/lib/shield/store";
import { DEMO_ACTOR_ID } from "@/lib/shield/types";
import type {
  ReportDraft,
  ReportKind,
  ReportRecord,
  SavedNumber,
  ShieldActionEntry,
  ShieldActionId,
  ShieldStoreState,
} from "@/lib/shield/types";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS: Record<ShieldActionId, true> = {
  block_device: true,
  save_number: true,
  block_and_save: true,
  report_operator: true,
  report_traficom: true,
  evidence_pack: true,
};

const OUTBOUND_ACTIONS: Partial<Record<ShieldActionId, true>> = {
  report_operator: true,
  report_traficom: true,
  evidence_pack: true,
};

const KIND_BY_ACTION: Partial<Record<ShieldActionId, ReportKind>> = {
  report_operator: "operator",
  report_traficom: "traficom",
  evidence_pack: "police",
};

const ACTION_STATUS: Record<ShieldActionId, string> = {
  block_device: "blocked on device",
  save_number: "saved to blocklist",
  block_and_save: "blocked and saved",
  report_operator: "draft ready for operator",
  report_traficom: "draft ready for Traficom",
  evidence_pack: "evidence pack ready for police",
};

interface ShieldPostResult {
  entry: ShieldActionEntry;
  reportId?: string;
  draft?: ReportDraft;
}

function upsertSaved(s: ShieldStoreState, number: string, eventId: string, actorId: string, auto: boolean): void {
  const existing = s.saved.find((n) => n.number === number && n.actorId === actorId);
  if (existing) {
    if (auto) existing.autoSaved = true;
    return;
  }
  const saved: SavedNumber = {
    number,
    actorId,
    firstEventId: eventId,
    savedAt: new Date().toISOString(),
    autoSaved: auto,
  };
  s.saved.push(saved);
}

function createReport(
  s: ShieldStoreState,
  args: { number: string; eventId: string; actorId: string; kind: ReportKind; now: string },
): { record: ReportRecord; draft: ReportDraft } {
  // Idempotent per event: repeated clicks extend the same record.
  let record = s.reports.find((r) => r.eventId === args.eventId && r.reporterId === args.actorId);
  if (!record) {
    const event = DEMO_CALL_EVENTS.find((e) => e.id === args.eventId);
    const decision = event ? decideSingleTurn(caseFromEvent(event)) : null;
    const riskLevel = decision?.risk_level ?? "none";
    const verified =
      Boolean(decision) && !decision?.abstained && (riskLevel === "high" || riskLevel === "critical");
    record = {
      id: `rpt-${args.eventId}`,
      number: args.number,
      eventId: args.eventId,
      reporterId: args.actorId,
      createdAt: args.now,
      language: event?.language ?? "en",
      riskLevel,
      primaryAction: decision?.primary_action ?? "no_action_needed",
      verified,
      voidedAt: null,
      drafts: [],
    };
    s.reports.push(record);
  }
  let draft = record.drafts.find((d) => d.kind === args.kind);
  if (!draft) {
    const event = DEMO_CALL_EVENTS.find((e) => e.id === args.eventId);
    const decision = event ? decideSingleTurn(caseFromEvent(event)) : null;
    draft = draftFor(
      {
        reportId: record.id,
        number: args.number,
        eventAt: event?.at ?? args.now,
        warningLabel: event?.warning?.label ?? null,
        callerAccount: event?.notes ?? "",
        language: record.language,
        decision,
      },
      args.kind,
      args.now,
    );
    record.drafts.push(draft);
  }
  return { record, draft };
}

/**
 * POST /api/shield
 * Body: { action: ShieldActionId, number: string, eventId: string, actorId?: string, auto?: boolean }
 * Outbound report actions additionally generate the matching draft. A suspended
 * account cannot create new outbound reports (403).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as ShieldActionId;
    const number = typeof body?.number === "string" ? body.number : "";
    const eventId = typeof body?.eventId === "string" ? body.eventId : "";
    const actorId = typeof body?.actorId === "string" && body.actorId ? body.actorId : DEMO_ACTOR_ID;
    const auto = Boolean(body?.auto);
    if (!action || !ALLOWED_ACTIONS[action] || !number || !eventId) {
      return NextResponse.json({ error: "Missing or invalid action, number or eventId" }, { status: 400 });
    }
    if (!DEMO_CALL_EVENTS.some((e) => e.id === eventId)) {
      return NextResponse.json({ error: "Unknown eventId" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const outcome = await mutate((s): { error: string | null; result: ShieldPostResult | null } => {
      if (OUTBOUND_ACTIONS[action] && (s.suspendedAt[actorId] ?? null)) {
        return { error: "Account suspended — outbound reporting is disabled", result: null };
      }
      const entry: ShieldActionEntry = {
        id: crypto.randomUUID(),
        action,
        number,
        eventId,
        actorId,
        status: ACTION_STATUS[action],
        at: now,
      };
      s.actions.push(entry);

      if (action === "save_number" || action === "block_and_save") {
        upsertSaved(s, number, eventId, actorId, auto);
      }

      const kind = KIND_BY_ACTION[action];
      if (kind) {
        const { record, draft } = createReport(s, { number, eventId, actorId, kind, now });
        return { error: null, result: { entry, reportId: record.id, draft } };
      }
      return { error: null, result: { entry } };
    });

    if (outcome.error) return NextResponse.json({ error: outcome.error }, { status: 403 });
    const s = await readState();
    return NextResponse.json({ ...outcome.result, standing: standingOf(s, actorId) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Bad request" }, { status: 400 });
  }
}

/** GET /api/shield — persisted action log, saved numbers and the account standing. */
export async function GET() {
  const s = await readState();
  return NextResponse.json({
    entries: s.actions,
    saved: s.saved.filter((n) => n.actorId === DEMO_ACTOR_ID),
    standing: standingOf(s, DEMO_ACTOR_ID),
  });
}
