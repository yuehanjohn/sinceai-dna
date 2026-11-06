// Misuse handling: false-report strikes → suspension → automatic removal
// notices to every partner holding the wrongly flagged numbers.
// Deterministic and window-based: N partner-verified "legitimate" outcomes on
// one account's reports inside the window = suspension. Nothing here is a
// punishment feature — the only effects are pulling the reporter's own reports
// back and purging the affected numbers from partner systems.

import { DEMO_PARTNERS, isVerifiedReport } from "./partners";
import { removalNotice } from "./reports";
import type {
  PartnerOutcome,
  RemovalNotice,
  ReportRecord,
  ShieldStoreState,
  StrikeEntry,
} from "./types";

export const STRIKE_LIMIT = 3;
export const STRIKE_WINDOW_DAYS = 90;

const STRIKE_WINDOW_MS = STRIKE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Reverse every credit paid for a signal (idempotent: one revocation line per report). */
function revokeCreditsFor(s: ShieldStoreState, reportId: string, now: string): boolean {
  const paid = s.credits.filter((c) => c.reportId === reportId && c.basis === "verified_signal" && c.eur > 0);
  if (paid.length === 0 || s.credits.some((c) => c.reportId === reportId && c.basis === "revocation")) {
    return false;
  }
  for (const c of paid) {
    s.credits.push({
      id: `credit-revoke-${c.id}`,
      at: now,
      partnerId: c.partnerId,
      reportId,
      number: c.number,
      eur: -c.eur,
      basis: "revocation",
    });
  }
  return true;
}

function strikesInWindow(strikes: StrikeEntry[], now: number): StrikeEntry[] {
  return strikes.filter((k) => now - new Date(k.at).getTime() <= STRIKE_WINDOW_MS);
}

export interface MisuseResult {
  outcome: PartnerOutcome;
  strikeAdded: StrikeEntry | null;
  suspended: boolean;
  notices: RemovalNotice[];
  creditsRevoked: boolean;
}

/**
 * Apply a partner outcome to a report.
 * - "confirmed": partner acted on the verified signal (credit handled by the caller).
 * - "legitimate": the number is verified as legitimate → false-report strike for
 *   the reporter, revocation of any credits paid for this report, and if the
 *   strike limit is reached: suspension + removal notices for every number the
 *   reporter has reported.
 */
export function applyPartnerOutcome(
  s: ShieldStoreState,
  outcome: PartnerOutcome,
  now: string,
): MisuseResult {
  const report = s.reports.find((r) => r.id === outcome.reportId);
  if (!report) throw new Error(`Unknown report ${outcome.reportId}`);

  s.outcomes.push(outcome);

  if (outcome.outcome === "confirmed") {
    return { outcome, strikeAdded: null, suspended: false, notices: [], creditsRevoked: false };
  }

  // Legitimate: void the report so it stops feeding the partner exchange.
  if (!report.voidedAt) report.voidedAt = now;

  // Revoke any credits paid to partners for this signal (idempotent: once).
  const creditsRevoked = revokeCreditsFor(s, report.id, now);

  const strike: StrikeEntry = {
    id: `strike-${outcome.id}`,
    at: now,
    actorId: report.reporterId,
    number: report.number,
    reportId: report.id,
    reason: "partner_marked_legitimate",
  };
  s.strikes.push(strike);

  const standing = s.suspendedAt[report.reporterId] ?? null;
  const activeStrikes = strikesInWindow(
    s.strikes.filter((k) => k.actorId === report.reporterId),
    new Date(now).getTime(),
  );
  if (!standing && activeStrikes.length >= STRIKE_LIMIT) {
    s.suspendedAt[report.reporterId] = now;
    // Pull back EVERY report this account made — including ones already voided
    // by an earlier partner verification, because partners that consumed the
    // signal still hold it and must be told to purge it — revoke their paid
    // credits and draft a removal notice per number.
    const notices: RemovalNotice[] = [];
    let anyRevoked = creditsRevoked;
    for (const r of s.reports.filter((r) => r.reporterId === report.reporterId)) {
      if (!r.voidedAt) r.voidedAt = now;
      anyRevoked = revokeCreditsFor(s, r.id, now) || anyRevoked;
      const notice = removalNotice({
        number: r.number,
        reportId: r.id,
        reporterId: r.reporterId,
        partnerIds: DEMO_PARTNERS.map((p) => p.id),
        language: r.language,
        reason: "account_suspended_for_misuse",
        at: now,
      });
      s.notices.push(notice);
      notices.push(notice);
    }
    return { outcome, strikeAdded: strike, suspended: true, notices, creditsRevoked: anyRevoked };
  }

  return { outcome, strikeAdded: strike, suspended: false, notices: [], creditsRevoked };
}

/** Reports eligible for the partner exchange feed (verified, not voided). */
export function exchangeableReports(s: ShieldStoreState): ReportRecord[] {
  return s.reports.filter((r) => isVerifiedReport(r));
}
