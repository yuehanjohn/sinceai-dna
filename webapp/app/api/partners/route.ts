import { NextRequest, NextResponse } from "next/server";
import { DEMO_CALL_EVENTS } from "@/lib/callEvents";
import { WEAK_LEAD_SHARE_EUR } from "@/lib/shield/channels";
import { promoteDue } from "@/lib/shield/fanout";
import { applyPartnerOutcome, exchangeableReports, type MisuseResult } from "@/lib/shield/misuse";
import { partnerCommissionTotal } from "@/lib/shield/leads";
import {
  VERIFIED_SIGNAL_CREDIT_EUR,
  isVerifiedReport,
  partnerById,
  partnerHasOutcomed,
  partnerTotalCredits,
} from "@/lib/shield/partners";
import { mutate, noticesForPartner, readState, standingOf } from "@/lib/shield/store";
import { DEMO_ACTOR_ID } from "@/lib/shield/types";
import type { CallEvent } from "@/lib/callEvents";
import type { PartnerOutcomeKind, PartnerSignalView, ReportRecord } from "@/lib/shield/types";

export const dynamic = "force-dynamic";

function eventFor(eventId: string): CallEvent | undefined {
  return DEMO_CALL_EVENTS.find((e) => e.id === eventId);
}

function toView(r: ReportRecord, outcomesByPartner: Map<string, PartnerOutcomeKind>): PartnerSignalView {
  const event = eventFor(r.eventId);
  return {
    reportId: r.id,
    number: r.number,
    eventAt: event?.at ?? null,
    warningCategory: event?.warning?.category ?? null,
    warningLabel: event?.warning?.label ?? null,
    language: r.language,
    riskLevel: r.riskLevel,
    primaryAction: r.primaryAction,
    verified: r.verified,
    myOutcome: outcomesByPartner.get(r.id) ?? null,
  };
}

/** GET /api/partners?partnerId=... — exchange feed, rev-share ledger and purge notices. */
export async function GET(req: NextRequest) {
  const partnerId = req.nextUrl.searchParams.get("partnerId") ?? "";
  const partner = partnerById(partnerId);
  if (!partner) {
    return NextResponse.json({ error: "Unknown partnerId" }, { status: 400 });
  }
  await mutate((st) => promoteDue(st, new Date().toISOString()));
  const s = await readState();
  const outcomesByPartner = new Map<string, PartnerOutcomeKind>();
  for (const o of s.outcomes.filter((o) => o.partnerId === partnerId)) {
    outcomesByPartner.set(o.reportId, o.outcome);
  }
  // Shield partners consume the verified exchange; weak-lead partners consume
  // the fired-back numbers they were sent; marketplace partners the consents.
  const signals = (partner.kind === "shield" ? exchangeableReports(s) : []).map((r) =>
    toView(r, outcomesByPartner),
  );
  const weakLeads =
    partner.kind === "weak_lead"
      ? s.submissions
          .filter((sub) => sub.channelId === partnerId)
          .map((sub) => ({
            submissionId: sub.id,
            number: sub.number,
            sharedAt: sub.createdAt,
            deliverAt: sub.deliverAt,
            status: sub.status,
            payload: sub.payload,
          }))
      : [];
  const credits = s.credits.filter((c) => c.partnerId === partnerId);
  return NextResponse.json({
    // Never expose the feed API key through the unauthenticated console endpoint.
    partner: { id: partner.id, name: partner.name, role: partner.role, kind: partner.kind },
    signals,
    weakLeads,
    weakLeadShareEur: WEAK_LEAD_SHARE_EUR,
    credits,
    totalEur: partnerTotalCredits(s.credits, partnerId),
    creditPerVerifiedSignalEur: VERIFIED_SIGNAL_CREDIT_EUR,
    notices: noticesForPartner(s, partnerId),
    ...(partner.kind === "marketplace"
      ? { leadCommissionOwedEur: partnerCommissionTotal(s, partnerId) }
      : {}),
  });
}

/**
 * POST /api/partners
 * Body: { partnerId, reportId, outcome: "confirmed" | "legitimate" }
 * "confirmed" → partner acted on the verified signal; earns the rev-share credit.
 * "legitimate" → the number is verified as legitimate: report is voided, credits
 * for it are revoked, the reporter takes a false-report strike, and at the strike
 * limit the account is suspended and removal notices are drafted to all partners.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const partner = partnerById(typeof body?.partnerId === "string" ? body.partnerId : "");
    const reportId = typeof body?.reportId === "string" ? body.reportId : "";
    const outcomeKind = body?.outcome as PartnerOutcomeKind;
    if (!partner || !reportId || (outcomeKind !== "confirmed" && outcomeKind !== "legitimate")) {
      return NextResponse.json({ error: "Missing or invalid partnerId, reportId or outcome" }, { status: 400 });
    }
    if (partner.kind !== "shield") {
      return NextResponse.json(
        {
          error:
            "Only blocklist (shield) partners post outcomes — weak-lead partners just hold the fired-back numbers, consent partners hold their own leads",
        },
        { status: 400 },
      );
    }

    const outcome = await mutate((s): { error: string } | { ok: true; misuse?: MisuseResult } => {
      const report = s.reports.find((r) => r.id === reportId);
      if (!report) return { error: `Unknown report ${reportId}` };
      if (partnerHasOutcomed(s.outcomes, partner.id, reportId)) {
        return { error: `Partner already responded to ${reportId}` };
      }
      if (outcomeKind === "confirmed" && !isVerifiedReport(report)) {
        return { error: `Report ${reportId} is not a verified signal` };
      }

      const outcomeRecord = {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        partnerId: partner.id,
        reportId,
        outcome: outcomeKind,
      };
      if (outcomeKind === "confirmed") {
        s.outcomes.push(outcomeRecord);
        s.credits.push({
          id: `credit-${outcomeRecord.id}`,
          at: outcomeRecord.at,
          partnerId: partner.id,
          reportId,
          number: report.number,
          eur: VERIFIED_SIGNAL_CREDIT_EUR,
          basis: "verified_signal",
        });
        return { ok: true };
      }
      const misuse = applyPartnerOutcome(s, outcomeRecord, outcomeRecord.at);
      return { ok: true, misuse };
    });

    if ("error" in outcome) {
      return NextResponse.json({ error: outcome.error }, { status: 400 });
    }

    const s = await readState();
    return NextResponse.json({
      ok: true,
      suspended: outcome.misuse?.suspended ?? false,
      noticesCount: outcome.misuse?.notices?.length ?? 0,
      notices: outcome.misuse?.notices ?? [],
      standing: standingOf(s, DEMO_ACTOR_ID),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Bad request" }, { status: 400 });
  }
}
