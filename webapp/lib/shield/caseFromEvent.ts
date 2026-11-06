// Shared mapping from a CallEvent to an engine CaseInput, used by both the
// client (Ask the assistant) and the server (report evidence). One mapping,
// one source of truth — the classification in a report draft is the same
// decision the user saw in the UI.

import type { CaseInput } from "../engine/types";
import type { CallEvent } from "../callEvents";

export function caseFromEvent(event: CallEvent, opts?: { audience?: "consumer" | "small_business" }): CaseInput {
  return {
    case_id: `shield-${event.id}`,
    journey: "suspicious_call",
    audience: opts?.audience ?? "consumer",
    language: event.language,
    opening_message: event.notes,
    signals: {
      artifact: { type: "call", sender: event.number, body: event.notes },
      call_warning: event.warning ? { category: event.warning.category, label: event.warning.label } : null,
    },
    consent: { requires_consent: [], pre_granted: [] },
  };
}
