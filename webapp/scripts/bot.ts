// Multi-turn bot speaking the JSON-lines protocol of sim/run_conversation.py.
//   python3 sim/run_conversation.py --cases data/dev/cases.jsonl \
//     --bot "node --experimental-strip-types webapp/scripts/bot.ts" --out mt.jsonl
import { createInterface } from "node:readline";
import { classify } from "../lib/engine/detect.ts";
import { buildDecision, decideMultiTurn } from "../lib/engine/decide.ts";
import type { CaseInput, ConversationState, Decision } from "../lib/engine/types.ts";

interface Conv {
  case: CaseInput;
  state: ConversationState;
  lastTopic: string | null;
  turns: number;
}

let conv: Conv | null = null;

const emit = (obj: unknown): void => {
  process.stdout.write(JSON.stringify(obj) + "\n");
};

function fallbackFinal(): { type: "final"; answer: Decision } {
  const answer: Decision = {
    case_id: conv?.case.case_id ?? "",
    mode: "multi_turn",
    risk_level: "medium",
    urgency: "today",
    primary_action: "verify_via_official_channel",
    advice_text: "I could not gather enough information. Do not click anything, do not pay, and check the matter in the official app or service yourself.",
    steps: [],
    escalation_required: false,
    confidence: 0.4,
    abstained: false,
  };
  return { type: "final", answer };
}

function nextReply(): unknown {
  if (!conv) return fallbackFinal();
  try {
    const res = decideMultiTurn(conv.case, conv.state);
    if (res.decision) return { type: "final", answer: { ...res.decision, mode: "multi_turn" } };
    if (res.turn?.type === "question") {
      conv.turns += 1;
      for (const t of res.turn.topics) if (!conv.state.askedTopics.includes(t)) conv.state.askedTopics.push(t);
      conv.lastTopic = res.turn.topics[0] ?? null;
      if (conv.turns > 6) {
        const { archetype } = classify(conv.case);
        return { type: "final", answer: { ...buildDecision(conv.case, archetype, conv.state, false), mode: "multi_turn" } };
      }
      return res.turn;
    }
    if (res.turn?.type === "consent_request") {
      conv.turns += 1;
      for (const f of res.turn.fields) if (!conv.state.consentAsked.includes(f)) conv.state.consentAsked.push(f);
      if (conv.turns > 6) {
        const { archetype } = classify(conv.case);
        return { type: "final", answer: { ...buildDecision(conv.case, archetype, conv.state, false), mode: "multi_turn" } };
      }
      return res.turn;
    }
    return fallbackFinal();
  } catch {
    return fallbackFinal();
  }
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let ev: Record<string, unknown>;
  try {
    ev = JSON.parse(line);
  } catch {
    return;
  }
  try {
    switch (ev.type) {
      case "start": {
        conv = {
          case: ev.case as CaseInput,
          state: { facts: {}, granted: [], refused: [], askedTopics: [], consentAsked: [] },
          lastTopic: null,
          turns: 0,
        };
        emit(nextReply());
        break;
      }
      case "user_reply": {
        if (conv && conv.lastTopic) conv.state.facts[conv.lastTopic] = String(ev.text ?? "");
        if (conv) conv.lastTopic = null;
        emit(nextReply());
        break;
      }
      case "consent_reply": {
        if (conv) {
          const sig = ev.signals as Record<string, unknown> | undefined;
          if (sig && typeof sig === "object" && !Array.isArray(sig)) {
            for (const f of Object.keys(sig)) if (!conv.state.granted.includes(f)) conv.state.granted.push(f);
          }
          const grantedArr = Array.isArray(ev.granted) ? (ev.granted as string[]) : [];
          for (const f of grantedArr) if (!conv.state.granted.includes(f)) conv.state.granted.push(f);
          const refusedArr = Array.isArray(ev.refused) ? (ev.refused as string[]) : [];
          for (const f of refusedArr) if (!conv.state.refused.includes(f)) conv.state.refused.push(f);
        }
        emit(nextReply());
        break;
      }
      case "turn_limit": {
        if (conv) {
          const { archetype } = classify(conv.case);
          emit({ type: "final", answer: { ...buildDecision(conv.case, archetype, conv.state, false), mode: "multi_turn" } });
        } else {
          emit(fallbackFinal());
        }
        break;
      }
      default:
        break;
    }
  } catch {
    emit(fallbackFinal());
  }
});
