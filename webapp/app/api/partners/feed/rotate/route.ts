import { NextRequest, NextResponse } from "next/server";
import { partnerByApiKey } from "@/lib/shield/partners";
import { mutate } from "@/lib/shield/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/partners/feed/rotate — partner self-service key rotation.
 * Auth: the CURRENT X-Partner-Key. On success the new key is returned once and
 * becomes effective immediately; the previous key stops working. Rotated keys
 * persist in the store (`partnerKeys`); the registry key is the seed for
 * partners that have never rotated.
 */
export async function POST(req: NextRequest) {
  const key = req.headers.get("x-partner-key") ?? "";
  const result = await mutate((s) => {
    const partner = partnerByApiKey(s, key);
    if (!partner) {
      return { error: "Missing or invalid partner API key" } as const;
    }
    const apiKey = `pfk-${partner.id}-${crypto.randomUUID()}`;
    s.partnerKeys[partner.id] = apiKey;
    return { ok: true as const, partnerId: partner.id, apiKey };
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  return NextResponse.json(result);
}
