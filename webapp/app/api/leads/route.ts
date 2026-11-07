import { NextRequest, NextResponse } from "next/server";
import type { Language } from "@/lib/engine/types";
import {
  LEAD_COMMISSION_EUR,
  USER_REWARD_EUR,
  consentToLead,
  revokeConsent,
  userRewardTotal,
} from "@/lib/shield/leads";
import { marketplacePartners } from "@/lib/shield/partners";
import { mutate, readState } from "@/lib/shield/store";
import { DEMO_ACTOR_ID } from "@/lib/shield/types";

export const dynamic = "force-dynamic";

const LANGUAGES: Language[] = ["fi", "en", "sv"];

/** GET /api/leads — the demo account's lead consents, delivered leads and reward total. */
export async function GET() {
  const s = await readState();
  const consents = s.consents.filter((c) => c.actorId === DEMO_ACTOR_ID);
  const consentIds = new Set(consents.map((c) => c.id));
  const grants = s.leadGrants.filter((g) => consentIds.has(g.consentId));
  return NextResponse.json({
    partners: marketplacePartners().map(({ id, name, role }) => ({ id, name, role })),
    rewardPerLeadEur: USER_REWARD_EUR,
    commissionPerLeadEur: LEAD_COMMISSION_EUR,
    consents,
    grants,
    rewardTotalEur: userRewardTotal(s, DEMO_ACTOR_ID),
  });
}

/**
 * POST /api/leads
 * { action: "consent", partnerId, number, language? } — share the user's OWN
 *   number with one marketplace partner for offers; grants the lead, books the
 *   user reward. One active consent per partner.
 * { action: "revoke", consentId } — withdraw consent: the lead is voided
 *   economically, the reward is revoked and the partner receives a purge
 *   notice (GDPR Art. 7(3) / 17(1)(b) / 19).
 * A suspended account gets 403 on "consent" (no new lead pipelines while
 * suspended); "revoke" stays available because it only reduces contact.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action;

    if (action === "consent") {
      const partnerId = typeof body?.partnerId === "string" ? body.partnerId : "";
      const number = typeof body?.number === "string" ? body.number.trim() : "";
      const partner = marketplacePartners().find((p) => p.id === partnerId);
      if (!partner || !number) {
        return NextResponse.json({ error: "Missing or invalid partnerId or number" }, { status: 400 });
      }
      const language: Language =
        typeof body?.language === "string" && (LANGUAGES as string[]).includes(body.language)
          ? body.language
          : "en";
      const result = await mutate((s) => {
        // A suspended account must not open new lead pipelines — mirroring the
        // 403 on outbound reports. Withdrawal stays available (risk-reducing).
        if (s.suspendedAt[DEMO_ACTOR_ID]) {
          return {
            error: "Account suspended — offer sharing is locked while the account is suspended.",
            forbidden: true,
          } as const;
        }
        const existing = s.consents.find(
          (c) => c.partnerId === partnerId && c.actorId === DEMO_ACTOR_ID && !c.withdrawnAt,
        );
        if (existing) {
          return { error: `Already sharing your number with ${partner.name}. Withdraw first to change it.` };
        }
        const { consent, grant } = consentToLead(s, {
          actorId: DEMO_ACTOR_ID,
          partnerId,
          number,
          language,
          now: new Date().toISOString(),
        });
        return {
          ok: true as const,
          consent,
          grant,
          rewardTotalEur: userRewardTotal(s, DEMO_ACTOR_ID),
        };
      });
      if ("error" in result) {
        return NextResponse.json(
          { error: result.error },
          { status: "forbidden" in result && result.forbidden ? 403 : 400 },
        );
      }
      return NextResponse.json(result);
    }

    if (action === "revoke") {
      const consentId = typeof body?.consentId === "string" ? body.consentId : "";
      if (!consentId) {
        return NextResponse.json({ error: "Missing consentId" }, { status: 400 });
      }
      const result = await mutate((s) => {
        const consent = s.consents.find((c) => c.id === consentId && c.actorId === DEMO_ACTOR_ID);
        if (!consent) {
          return { error: `Unknown consent ${consentId}` };
        }
        if (consent.withdrawnAt) {
          return { error: "Consent already withdrawn" };
        }
        const { consent: withdrawn, notice } = revokeConsent(s, {
          consentId,
          now: new Date().toISOString(),
        });
        return {
          ok: true as const,
          consent: withdrawn,
          notice,
          rewardTotalEur: userRewardTotal(s, DEMO_ACTOR_ID),
        };
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Bad request" }, { status: 400 });
  }
}
