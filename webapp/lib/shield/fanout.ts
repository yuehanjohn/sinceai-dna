// Fire back: one tap turns a detected caller's number into a weak lead across
// the channel registry. Deterministic end to end — the same call always
// produces the same targets, the same payloads and the same ledger lines.
//
// Delivery is *scheduled* in this demo (staggered `deliverAt` a few hundred ms
// apart) so the UI can watch the fan-out land; promotion queued → delivered is
// lazy and idempotent, called by the read endpoints. A production integration
// would POST the payloads to the partners' own endpoints and flip the status
// from their response (see /api/partners/feed for the pull side).
//
// Nothing here is consent-based: the caller never agreed to be a lead. That is
// exactly why the lead is weak and why the partner is paid from subscription
// profit instead of paying the platform.

import { fanoutPlan, fillForm, WEAK_LEAD_SHARE_EUR } from "./channels";
import type { Language } from "../engine/types";
import type { ShieldStoreState, Submission } from "./types";

/** Demo delivery stagger: keeps the board readable while it fills. */
const DELIVER_STAGGER_MS = 350;

export interface FireBackArgs {
  actorId: string;
  number: string;
  eventId: string;
  reportId: string;
  language: Language;
  harasser: boolean;
  now: string;
}

/**
 * Queue the fan-out for one number: one submission per planned channel, each
 * with its filled form, and one weak-lead rev-share line per target.
 * Idempotent per event: re-firing the same event does not duplicate targets.
 */
export function fireBack(s: ShieldStoreState, args: FireBackArgs): Submission[] {
  const existing = s.submissions.filter((sub) => sub.eventId === args.eventId && sub.actorId === args.actorId);
  if (existing.length > 0) return existing;

  const base = new Date(args.now).getTime();
  const created: Submission[] = [];
  fanoutPlan(args.harasser).forEach((channel, index) => {
    const submission: Submission = {
      id: `sub-${args.eventId}-${channel.id}`,
      number: args.number,
      reportId: args.reportId,
      eventId: args.eventId,
      actorId: args.actorId,
      channelId: channel.id,
      channelKind: channel.kind,
      channelName: channel.name,
      createdAt: args.now,
      deliverAt: new Date(base + DELIVER_STAGGER_MS * (index + 1)).toISOString(),
      status: "queued",
      payload: fillForm(channel, { number: args.number, language: args.language, harasser: args.harasser }),
      purgedAt: null,
    };
    s.submissions.push(submission);
    created.push(submission);
    s.credits.push({
      id: `credit-weak-${submission.id}`,
      at: args.now,
      partnerId: channel.id,
      reportId: args.reportId,
      number: args.number,
      eur: WEAK_LEAD_SHARE_EUR,
      basis: "weak_lead",
    });
  });
  return created;
}

/** Lazy scheduler: anything whose deliverAt has passed becomes delivered. */
export function promoteDue(s: ShieldStoreState, now: string): number {
  const t = new Date(now).getTime();
  let promoted = 0;
  for (const sub of s.submissions) {
    if (sub.status === "queued" && new Date(sub.deliverAt).getTime() <= t) {
      sub.status = "delivered";
      promoted += 1;
    }
  }
  return promoted;
}

export function submissionsForEvent(s: ShieldStoreState, eventId: string, actorId: string): Submission[] {
  return s.submissions.filter((sub) => sub.eventId === eventId && sub.actorId === actorId);
}

/** Targets that already hold a given number — the purge addressees. */
export function holdersOf(s: ShieldStoreState, number: string, actorId: string): string[] {
  return [...new Set(s.submissions.filter((sub) => sub.number === number && sub.actorId === actorId).map((sub) => sub.channelId))];
}

export interface PurgeResult {
  submissions: Submission[];
  /** Channel ids that were holding the numbers and must now delete them. */
  channelIds: string[];
  creditsRevoked: boolean;
}

/**
 * Pull every fired-back number back: mark the submissions purged, reverse the
 * weak-lead rev-share lines (once) and report who has to delete what. Used by
 * the misuse path — a suspended account's leads stop being worth anything, so
 * the partners are told to drop them.
 */
export function purgeSubmissions(s: ShieldStoreState, args: { actorId: string; now: string }): PurgeResult {
  const mine = s.submissions.filter((sub) => sub.actorId === args.actorId && sub.status !== "purged");
  let creditsRevoked = false;
  for (const sub of mine) {
    sub.status = "purged";
    sub.purgedAt = args.now;
    const paid = s.credits.filter((c) => c.id === `credit-weak-${sub.id}`);
    const alreadyReversed = s.credits.some((c) => c.id === `credit-weak-revoke-${sub.id}`);
    if (paid.length > 0 && !alreadyReversed) {
      for (const c of paid) {
        s.credits.push({ ...c, id: `credit-weak-revoke-${sub.id}`, at: args.now, eur: -c.eur, basis: "weak_lead_revocation" });
      }
      creditsRevoked = true;
    }
  }
  return { submissions: mine, channelIds: [...new Set(mine.map((sub) => sub.channelId))], creditsRevoked };
}

/** Fan-out summary for one number, used by the UI board and API responses. */
export interface FanoutSummary {
  total: number;
  queued: number;
  delivered: number;
  purged: number;
  byKind: Record<string, number>;
  hasHarasserExtra: boolean;
}

export function summarize(submissions: Submission[]): FanoutSummary {
  const byKind: Record<string, number> = {};
  let queued = 0;
  let delivered = 0;
  let purged = 0;
  let hasHarasserExtra = false;
  for (const sub of submissions) {
    byKind[sub.channelKind] = (byKind[sub.channelKind] ?? 0) + 1;
    if (sub.status === "queued") queued += 1;
    if (sub.status === "delivered") delivered += 1;
    if (sub.status === "purged") purged += 1;
    if (sub.channelKind === "harasser_site") hasHarasserExtra = true;
  }
  return { total: submissions.length, queued, delivered, purged, byKind, hasHarasserExtra };
}
