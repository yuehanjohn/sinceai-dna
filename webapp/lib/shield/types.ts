// Shared data shapes for the Call Shield compliance pipeline:
// action log, evidence, report drafts, partner exchange, rev-share ledger,
// misuse strikes/suspension and partner removal notices.
// Pure data shapes only — no runtime logic.

import type { Language, RiskLevel, Action } from "../engine/types";

/** The single demo account that owns the shield (the business owner persona). */
export const DEMO_ACTOR_ID = "acct-demo-owner";

/** Actions a shield user can trigger from the UI. */
export type ShieldActionId =
  | "block_device"
  | "save_number"
  | "block_and_save"
  | "report_operator"
  | "report_traficom"
  | "evidence_pack";

/** Outbound-report channels; each maps to a report draft. */
export type ReportKind = "operator" | "traficom" | "police";

export interface ShieldActionEntry {
  id: string;
  action: ShieldActionId;
  number: string;
  eventId: string;
  actorId: string;
  status: string;
  at: string;
}

/** A number the user (or auto-shield) has saved to their personal blocklist. */
export interface SavedNumber {
  number: string;
  actorId: string;
  firstEventId: string;
  savedAt: string;
  /** true when saved automatically on detection, false when user-initiated only. */
  autoSaved: boolean;
}

/** A structured, ready-to-send report draft. */
export interface ReportDraft {
  kind: ReportKind;
  language: Language;
  subject: string;
  body: string;
  generatedAt: string;
}

/** A user report on a number, with the engine classification baked in as evidence. */
export interface ReportRecord {
  id: string;
  number: string;
  eventId: string;
  reporterId: string;
  createdAt: string;
  language: Language;
  riskLevel: RiskLevel;
  primaryAction: Action;
  /** Engine high/critical risk and not abstained → eligible for partner exchange. */
  verified: boolean;
  /** Set when a partner outcome marked the report as not-a-scam; credits are revoked. */
  voidedAt: string | null;
  drafts: ReportDraft[];
}

export type PartnerOutcomeKind = "confirmed" | "legitimate";

/** Partner-facing signal view. Deliberately excludes the reporter's personal
 * statement: partners receive the number, the network warning and the engine
 * classification — never the user's narrative or identity. */
export interface PartnerSignalView {
  reportId: string;
  number: string;
  eventAt: string | null;
  warningCategory: string | null;
  warningLabel: string | null;
  language: string;
  riskLevel: string;
  primaryAction: string;
  verified: boolean;
  myOutcome: PartnerOutcomeKind | null;
}

export interface PartnerOutcome {
  id: string;
  at: string;
  partnerId: string;
  reportId: string;
  outcome: PartnerOutcomeKind;
}

/** Revenue-share ledger line. Negative amounts revoke earlier credits. */
export interface CreditEntry {
  id: string;
  at: string;
  partnerId: string;
  reportId: string;
  number: string;
  eur: number;
  basis: "verified_signal" | "revocation";
}

export interface StrikeEntry {
  id: string;
  at: string;
  actorId: string;
  number: string;
  reportId: string;
  reason: "partner_marked_legitimate";
}

/** Auto-drafted request to partners to purge a number after a false/misused report. */
export interface RemovalNotice {
  id: string;
  at: string;
  number: string;
  reporterId: string;
  partnerIds: string[];
  language: Language;
  subject: string;
  body: string;
  reason:
    | "account_suspended_for_misuse"
    | "report_proven_not_scam"
    | "consent_withdrawn";
}

/** A user's explicit, per-partner consent to share their OWN number for offers.
 * Scope: only the consenting user's own contact detail — never a reported
 * third-party number. Withdrawal is always available and triggers a purge. */
export interface LeadConsent {
  id: string;
  at: string;
  actorId: string;
  partnerId: string;
  number: string;
  language: Language;
  /** Set when the user withdrew consent; the partner must purge the number. */
  withdrawnAt: string | null;
}

/** A lead delivered to a partner on the basis of an explicit user consent.
 * Carries both sides of the marketplace economics: what the partner pays and
 * what the user earns. Revoked together with the consent on withdrawal. */
export interface LeadGrant {
  id: string;
  at: string;
  consentId: string;
  partnerId: string;
  number: string;
  userRewardEur: number;
  commissionEur: number;
  /** Set when the consent was withdrawn: the lead is voided economically. */
  rewardRevokedAt: string | null;
}

export interface AccountStanding {
  actorId: string;
  strikes: StrikeEntry[];
  strikeLimit: number;
  suspendedAt: string | null;
}

export interface ShieldStoreState {
  actions: ShieldActionEntry[];
  saved: SavedNumber[];
  reports: ReportRecord[];
  outcomes: PartnerOutcome[];
  credits: CreditEntry[];
  strikes: StrikeEntry[];
  notices: RemovalNotice[];
  /** Opt-in lead marketplace: user consents to share their own number. */
  consents: LeadConsent[];
  /** Leads delivered to partners on the basis of an explicit user consent. */
  leadGrants: LeadGrant[];
  /** Effective feed API keys after rotation; registry keys are the seeds. */
  partnerKeys: Record<string, string>;
  suspendedAt: Record<string, string | null>;
}
