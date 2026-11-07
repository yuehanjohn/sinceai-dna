// Opt-in lead marketplace: the ONLY commerce path from this service to sales
// organisations. A partner can receive a phone number exclusively when the user
// explicitly consented to share their OWN number for offers, in exchange for a
// reward — and can withdraw at any time, which voids the lead economically,
// revokes the reward and drafts the partner a purge notice (GDPR Art. 7(3),
// 17(1)(b), 19). Nothing here ever touches reported third-party numbers: those
// flow only to the shield feed as suppression signals (see /misuse for policy).

import type { Language } from "../engine/types";
import { removalNotice } from "./reports";
import type { LeadConsent, LeadGrant, RemovalNotice, ShieldStoreState } from "./types";

/** What the partner pays the platform per consented lead. */
export const LEAD_COMMISSION_EUR = 6;
/** What the user earns in service credit for a consented lead. */
export const USER_REWARD_EUR = 2;

/** Record consent and deliver the lead to the partner immediately (demo:
 * delivery is synchronous). Deterministic economics from the constants above. */
export function consentToLead(
  s: ShieldStoreState,
  args: { actorId: string; partnerId: string; number: string; language: Language; now: string },
): { consent: LeadConsent; grant: LeadGrant } {
  const consent: LeadConsent = {
    id: `consent-${crypto.randomUUID()}`,
    at: args.now,
    actorId: args.actorId,
    partnerId: args.partnerId,
    number: args.number,
    language: args.language,
    withdrawnAt: null,
  };
  s.consents.push(consent);
  const grant: LeadGrant = {
    id: `lead-${crypto.randomUUID()}`,
    at: args.now,
    consentId: consent.id,
    partnerId: args.partnerId,
    number: args.number,
    userRewardEur: USER_REWARD_EUR,
    commissionEur: LEAD_COMMISSION_EUR,
    rewardRevokedAt: null,
  };
  s.leadGrants.push(grant);
  return { consent, grant };
}

/** Withdraw consent: void the lead's economics, draft the partner a purge
 * notice. Idempotent callers must check withdrawnAt before calling. */
export function revokeConsent(
  s: ShieldStoreState,
  args: { consentId: string; now: string },
): { consent: LeadConsent; notice: RemovalNotice } {
  const consent = s.consents.find((c) => c.id === args.consentId);
  if (!consent) throw new Error(`Unknown consent ${args.consentId}`);
  consent.withdrawnAt = args.now;
  for (const g of s.leadGrants) {
    if (g.consentId === consent.id && !g.rewardRevokedAt) g.rewardRevokedAt = args.now;
  }
  const notice = removalNotice({
    number: consent.number,
    reportId: consent.id,
    reporterId: consent.actorId,
    partnerIds: [consent.partnerId],
    language: consent.language,
    reason: "consent_withdrawn",
    at: args.now,
  });
  s.notices.push(notice);
  return { consent, notice };
}

/** Grants the partner may act on: consent still active. */
export function activeGrantsForPartner(s: ShieldStoreState, partnerId: string): LeadGrant[] {
  const withdrawn = new Set(s.consents.filter((c) => c.withdrawnAt).map((c) => c.id));
  return s.leadGrants.filter((g) => g.partnerId === partnerId && !withdrawn.has(g.consentId));
}

/** User's earned, non-revoked lead rewards. */
export function userRewardTotal(s: ShieldStoreState, actorId: string): number {
  const byActor = new Set(s.consents.filter((c) => c.actorId === actorId).map((c) => c.id));
  return (
    Math.round(
      s.leadGrants
        .filter((g) => byActor.has(g.consentId) && g.rewardRevokedAt === null)
        .reduce((sum, g) => sum + g.userRewardEur, 0) * 100,
    ) / 100
  );
}

/** Commission the partner currently owes for active leads. */
export function partnerCommissionTotal(s: ShieldStoreState, partnerId: string): number {
  return (
    Math.round(
      s.leadGrants
        .filter((g) => g.partnerId === partnerId && g.rewardRevokedAt === null)
        .reduce((sum, g) => sum + g.commissionEur, 0) * 100,
    ) / 100
  );
}
