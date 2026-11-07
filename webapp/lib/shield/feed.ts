// Cursor-based partner sync feed: one authenticated endpoint partners poll to
// keep their systems in sync. Shield-kind partners receive verified scam
// signals (number + network warning + engine classification only — never user
// identity or statement) plus retractions and removal notices so wrongly
// flagged numbers get purged. Marketplace-kind partners receive ONLY leads the
// user explicitly consented to share, plus revocations when that consent is
// withdrawn. Two audiences, one endpoint, strictly separated by partner kind.

import { DEMO_CALL_EVENTS } from "../callEvents";
import { exchangeableReports } from "./misuse";
import { activeGrantsForPartner } from "./leads";
import type { PartnerInfo } from "./partners";
import type { LeadGrant, RemovalNotice, ShieldStoreState } from "./types";

export interface FeedSignal {
  reportId: string;
  number: string;
  eventAt: string | null;
  firstSharedAt: string;
  warningCategory: string | null;
  warningLabel: string | null;
  language: string;
  riskLevel: string;
  primaryAction: string;
  confirmedByPartner: boolean;
}

export interface FeedRetraction {
  reportId: string;
  number: string;
  at: string;
}

export interface FeedLead {
  grantId: string;
  consentId: string;
  number: string;
  consentedAt: string;
  language: string;
  userRewardEur: number;
  commissionEur: number;
}

export interface FeedLeadRevocation {
  grantId: string;
  number: string;
  at: string;
}

export interface PartnerFeedDelta {
  partner: { id: string; name: string; role: string; kind: PartnerInfo["kind"] };
  generatedAt: string;
  /** Opaque cursor: pass it back as ?since= on the next poll. */
  cursor: string;
  signals: FeedSignal[];
  retracted: FeedRetraction[];
  notices: RemovalNotice[];
  leads: FeedLead[];
  leadRevocations: FeedLeadRevocation[];
}

/** ISO timestamps can carry different offsets — compare as instants. */
function after(at: string | null | undefined, since: string | null): boolean {
  if (!at) return false;
  if (!since) return true;
  const t = new Date(at).getTime();
  const s = new Date(since).getTime();
  return Number.isFinite(t) && Number.isFinite(s) && t > s;
}

export function buildFeed(s: ShieldStoreState, partner: PartnerInfo, since: string | null): PartnerFeedDelta {
  const now = new Date().toISOString();

  let signals: FeedSignal[] = [];
  let retracted: FeedRetraction[] = [];
  let leads: FeedLead[] = [];
  let leadRevocations: FeedLeadRevocation[] = [];

  if (partner.kind === "shield") {
    const confirmedIds = new Set(
      s.outcomes
        .filter((o) => o.partnerId === partner.id && o.outcome === "confirmed")
        .map((o) => o.reportId),
    );
    signals = exchangeableReports(s)
      .filter((r) => after(r.createdAt, since))
      .map((r) => {
        const event = DEMO_CALL_EVENTS.find((e) => e.id === r.eventId);
        return {
          reportId: r.id,
          number: r.number,
          eventAt: event?.at ?? null,
          firstSharedAt: r.createdAt,
          warningCategory: event?.warning?.category ?? null,
          warningLabel: event?.warning?.label ?? null,
          language: r.language,
          riskLevel: r.riskLevel,
          primaryAction: r.primaryAction,
          confirmedByPartner: confirmedIds.has(r.id),
        };
      });
    // Voided verified reports must be purged from partner systems, even when no
    // formal removal notice exists yet (single legitimate outcome).
    retracted = s.reports
      .filter(
        (r) =>
          r.voidedAt &&
          after(r.voidedAt, since) &&
          r.verified &&
          (r.riskLevel === "high" || r.riskLevel === "critical"),
      )
      .map((r) => ({ reportId: r.id, number: r.number, at: r.voidedAt as string }));
  }

  if (partner.kind === "marketplace") {
    // Delta semantics: with a cursor, only grants created after it are sent —
    // the partner already holds older ones from an earlier snapshot.
    leads = activeGrantsForPartner(s, partner.id)
      .filter((g) => after(g.at, since))
      .map((g) => {
      const consent = s.consents.find((c) => c.id === g.consentId);
      return {
        grantId: g.id,
        consentId: g.consentId,
        number: g.number,
        consentedAt: consent?.at ?? g.at,
        language: consent?.language ?? "en",
        userRewardEur: g.userRewardEur,
        commissionEur: g.commissionEur,
      };
    });
    leadRevocations = s.leadGrants
      .map((g: LeadGrant) => {
        const consent = s.consents.find((c) => c.id === g.consentId);
        return { g, withdrawnAt: consent?.withdrawnAt ?? null };
      })
      .filter((entry) => entry.withdrawnAt && after(entry.withdrawnAt, since))
      .map((entry) => ({ grantId: entry.g.id, number: entry.g.number, at: entry.withdrawnAt as string }));
  }

  const notices = s.notices.filter((n) => n.partnerIds.includes(partner.id) && after(n.at, since));

  return {
    partner: { id: partner.id, name: partner.name, role: partner.role, kind: partner.kind },
    generatedAt: now,
    cursor: now,
    signals,
    retracted,
    notices,
    leads,
    leadRevocations,
  };
}
