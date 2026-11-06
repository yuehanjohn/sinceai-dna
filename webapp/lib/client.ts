import type {
  AssistantTurn,
  CaseInput,
  ConversationState,
  Decision,
} from "./engine/types";

export type Mode = "single_turn" | "multi_turn";

export interface AssistantRequestBody {
  case: CaseInput;
  mode: Mode;
  /** Conversation state; only sent in multi_turn mode. */
  state?: ConversationState;
}

export interface AssistantResponseBody {
  decision: Decision | null;
  turn?: AssistantTurn;
}

/** Typed helper for POST /api/assistant. Throws on non-2xx responses. */
export async function runAssistant(
  body: AssistantRequestBody,
  signal?: AbortSignal,
): Promise<AssistantResponseBody> {
  const res = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      // ignore read failures; status code alone is enough
    }
    throw new Error(
      `Assistant request failed (${res.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`,
    );
  }
  return (await res.json()) as AssistantResponseBody;
}
