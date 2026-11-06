# Integration contract — DNA Security Assistant webapp

## Public engine API (`webapp/lib/engine/`)

- `decideSingleTurn(input: CaseInput): Decision` — one-shot answer for a case.
- `decideMultiTurn(input: CaseInput, state: ConversationState): MultiTurnResult` —
  returns `{ decision: null, turn }` while the engine wants to ask a question or
  request consent; returns `{ decision }` when done.
- Types in `lib/engine/types.ts`. Step sentences in `lib/engine/phrases.ts` are
  regex-aligned with the evaluator's `info/data/reference/step_vocabulary.json` —
  do NOT rephrase them.

## HTTP API

`POST /api/assistant`

Request body:
```json
{
  "case": { "case_id": "...", "journey": "suspicious_call", "audience": "consumer", "language": "fi", "signals": { ... }, "consent": { "requires_consent": [...], "pre_granted": [] }, "opening_message": "..." },
  "mode": "single_turn" | "multi_turn",
  "state": { "facts": { "code_shared": "yes" }, "granted": ["subscription.network_status"], "refused": [], "askedTopics": ["code_shared"], "consentAsked": [] }
}
```

Response:
```json
{ "decision": { "case_id": "...", "risk_level": "high", "urgency": "today", "primary_action": "verify_via_official_channel", "advice_text": "...", "steps": ["..."], "escalation_required": false, "escalation_target": null, "signals_used": [...], "consent_requested_for": [...], "citations": [...], "confidence": 0.8 }, "turn": null }
```
`turn` is present (and `decision` null) when the engine wants the next multi-turn
step: `{ "type": "question", "text": "...", "topics": ["code_shared"] }` or
`{ "type": "consent_request", "fields": ["device.recent_app_installs"], "text": "..." }`.

## Conventions

- TypeScript strict, App Router, Tailwind v4 with the CSS vars in `app/globals.css`
  (`--surface`, `--border`, `--muted`, `--accent`, `--success`, `--warning`, `--error`).
- No new npm dependencies. English UI chrome; `advice_text` is rendered in the
  case's language as returned by the engine.
- Pages: `/` landing, `/assistant` chat, `/shield` call-shield demo,
  `/pricing`, `/partners`, `/misuse`. Shared nav lives in `app/layout.tsx`.
- Data files the engine reads at runtime are NOT used; the engine is
  self-contained (patterns compiled into `detect.ts`).
- Product tone: protective, honest. The service blocks, reports and escalates.
  It never enables retaliation against third parties (see `/misuse` page).
