// Partner exchange: registry, the deterministic verification rule that decides
// which user reports are eligible for partner consumption, and the revenue-
// share ledger rule. Partners are paid per *verified threat signal* they act
// on — never for marketing leads, never for spamming targets (see /misuse).

import type {
  CreditEntry,
  PartnerOutcome,
  ReportRecord,
} from "./types";
import { DEMO_ACTOR_ID } from "./types";

export interface PartnerInfo {
  id: string;
  name: string;
  role: string;
}

/** Demo partner registry. A real deployment authenticates partners; this demo trusts the id. */
export const DEMO_PARTNERS: PartnerInfo[] = [
  { id: "pilot-network-filter", name: "DNA network filtering", role: "Operator edge blocklist" },
  { id: "vendor-securephones", name: "SecurePhone Labs", role: "Device-security vendor" },
  { id: "consumer-blocklist-alliance", name: "Consumer blocklist alliance", role: "Cross-operator sharing" },
];

/** Revenue share: EUR credited per verified signal a partner confirms and acts on. */
export const VERIFIED_SIGNAL_CREDIT_EUR = 0.4;

/** A report is exchange-eligible when the deterministic engine is confident. */
export function isVerifiedReport(r: Pick<ReportRecord, "riskLevel" | "verified" | "voidedAt">): boolean {
  const risky = r.riskLevel === "high" || r.riskLevel === "critical";
  return r.verified && risky && !r.voidedAt;
}

export function partnerById(id: string): PartnerInfo | undefined {
  return DEMO_PARTNERS.find((p) => p.id === id);
}

export function partnerTotalCredits(credits: CreditEntry[], partnerId: string): number {
  return (
    Math.round(
      credits
        .filter((c) => c.partnerId === partnerId)
        .reduce((sum, c) => sum + c.eur, 0) * 100,
    ) / 100
  );
}

export function partnerHasOutcomed(outcomes: PartnerOutcome[], partnerId: string, reportId: string): boolean {
  return outcomes.some((o) => o.partnerId === partnerId && o.reportId === reportId);
}
