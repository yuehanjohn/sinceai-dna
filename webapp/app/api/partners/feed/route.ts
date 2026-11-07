import { NextRequest, NextResponse } from "next/server";
import { buildFeed } from "@/lib/shield/feed";
import { promoteDue } from "@/lib/shield/fanout";
import { partnerByApiKey } from "@/lib/shield/partners";
import { mutate, readState } from "@/lib/shield/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/partners/feed — authenticated partner sync feed.
 * Auth: X-Partner-Key header (seed keys in lib/shield/partners.ts; rotated
 * keys are store-backed — rotate via POST /api/partners/feed/rotate).
 * Query: ?since=<cursor> for a delta since the previous
 * poll; omit for a full snapshot. The response always carries a fresh cursor.
 *
 * Shield-kind partners get verified scam signals (number + network warning +
 * engine classification only), retractions of voided reports and removal
 * notices to purge. Marketplace-kind partners get ONLY leads the user
 * explicitly consented to share, plus revocations when consent is withdrawn.
 */
export async function GET(req: NextRequest) {
  const key = req.headers.get("x-partner-key") ?? "";
  await mutate((s) => promoteDue(s, new Date().toISOString()));
  const s = await readState();
  const partner = partnerByApiKey(s, key);
  if (!partner) {
    return NextResponse.json({ error: "Missing or invalid partner API key" }, { status: 401 });
  }
  const since = req.nextUrl.searchParams.get("since");
  return NextResponse.json(buildFeed(s, partner, since));
}
