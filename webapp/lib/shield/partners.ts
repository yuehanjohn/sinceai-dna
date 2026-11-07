// Partner exchange: registry, the deterministic verification rule that decides
// which user reports are eligible for partner consumption, and the revenue-
// share ledger rule. Two kinds of partner value are paid out of *subscription
// profit* (see channels.ts):
//   - verified threat signals a shield partner acts on (network blocking),
//   - weak leads a fire-back partner works (the caller who scammed someone).
// Lead commerce is separate (lib/shield/leads.ts): a marketplace partner may
// only receive a number the user chose to share for offers, with a reward for
// the user and withdrawal rights.

import type {
  CreditEntry,
  PartnerOutcome,
  ReportRecord,
  ShieldStoreState,
} from "./types";
import { DEMO_ACTOR_ID } from "./types";
import { FANOUT_CHANNELS } from "./channels";

/** What the partner consumes: "shield" = verified scam signals for blocking,
 * "weak_lead" = a fired-back caller's number to call (unconsented, paid from
 * the subscription profit share), "marketplace" = consent-based leads the user
 * chose to share for a reward. */
export type PartnerKind = "shield" | "weak_lead" | "marketplace";

export interface PartnerInfo {
  id: string;
  name: string;
  role: string;
  kind: PartnerKind;
  /** Seed key for the /api/partners/feed API. Rotation is self-service
   * (POST /api/partners/feed/rotate) and store-backed; a real deployment stores keys hashed. */
  apiKey: string;
}

/** Demo partner registry. A real deployment authenticates partners; this demo trusts the key. */
export const DEMO_PARTNERS: PartnerInfo[] = [
  { id: "pilot-network-filter", name: "DNA network filtering", role: "Operator edge blocklist", kind: "shield", apiKey: "pfk-demo-pilot-network-filter-3f8a" },
  { id: "vendor-securephones", name: "SecurePhone Labs", role: "Device-security vendor", kind: "shield", apiKey: "pfk-demo-vendor-securephones-9c41" },
  { id: "consumer-blocklist-alliance", name: "Consumer blocklist alliance", role: "Cross-operator sharing", kind: "shield", apiKey: "pfk-demo-consumer-blocklist-alliance-6b27" },
  { id: "market-homelistings", name: "HomeListings kiinteistönvälitys", role: "Real-estate offers — consent-based leads only", kind: "marketplace", apiKey: "pfk-demo-market-homelistings-4d15" },
  { id: "market-solaroffers", name: "SolarOffers Finland", role: "Home-energy offers — consent-based leads only", kind: "marketplace", apiKey: "pfk-demo-market-solaroffers-8e62" },
  // Fan-out recipients are partners too: they are the ones paid for working the
  // weak leads, so they belong in the same registry as the blocklist partners.
  ...FANOUT_CHANNELS.map((c): PartnerInfo => ({ id: c.id, name: c.name, role: c.role, kind: "weak_lead", apiKey: c.apiKey })),
];

/** Partners that consume the verified scam-signal feed. */
export function shieldPartners(): PartnerInfo[] {
  return DEMO_PARTNERS.filter((p) => p.kind === "shield");
}

/** Partners that receive fired-back numbers as weak leads. */
export function weakLeadPartners(): PartnerInfo[] {
  return DEMO_PARTNERS.filter((p) => p.kind === "weak_lead");
}

/** Partners that may receive leads — and only numbers a user explicitly consented to share. */
export function marketplacePartners(): PartnerInfo[] {
  return DEMO_PARTNERS.filter((p) => p.kind === "marketplace");
}

/** Effective feed key for a partner: a rotated key (store-backed) wins over
 * the registry seed. */
export function currentApiKey(s: ShieldStoreState, partnerId: string): string {
  return s.partnerKeys[partnerId] ?? DEMO_PARTNERS.find((p) => p.id === partnerId)?.apiKey ?? "";
}

/** Resolve a partner from a bearer key using effective (rotation-aware) keys. */
export function partnerByApiKey(s: ShieldStoreState, key: string): PartnerInfo | undefined {
  if (!key) return undefined;
  return DEMO_PARTNERS.find((p) => currentApiKey(s, p.id) === key);
}

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
