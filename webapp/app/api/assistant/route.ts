import { NextRequest, NextResponse } from "next/server";
import { decideSingleTurn, decideMultiTurn } from "@/lib/engine/decide";
import type { CaseInput, ConversationState } from "@/lib/engine/types";

/**
 * POST /api/assistant
 * Body: {
 *   case: CaseInput,
 *   mode?: "single_turn" | "multi_turn",
 *   state?: ConversationState   // multi-turn only: facts, granted, refused, askedTopics, consentAsked
 * }
 * Response (multi_turn): { decision: Decision | null, turn?: AssistantTurn }
 * Response (single_turn): { decision: Decision }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = body?.case as CaseInput | undefined;
    if (!input || typeof input !== "object" || !input.journey || !input.signals) {
      return NextResponse.json({ error: "Missing 'case' with journey and signals" }, { status: 400 });
    }
    if (body.mode === "multi_turn") {
      const state: ConversationState = {
        facts: body.state?.facts ?? {},
        granted: body.state?.granted ?? [],
        refused: body.state?.refused ?? [],
        askedTopics: body.state?.askedTopics ?? [],
        consentAsked: body.state?.consentAsked ?? [],
      };
      return NextResponse.json(decideMultiTurn(input, state));
    }
    return NextResponse.json({ decision: decideSingleTurn(input) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Bad request" }, { status: 400 });
  }
}
