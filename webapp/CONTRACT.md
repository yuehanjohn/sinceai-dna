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

`POST /api/shield`

Request: `{ action, number, eventId, actorId?, auto? }` with action one of
`block_device | save_number | block_and_save | report_operator | report_traficom | evidence_pack`.
Outbound report actions generate the matching structured draft (operator /
Traficom / police, in the event's language) server-side from the engine
decision. Response: `{ entry: { action, number, eventId, status, at }, reportId?, draft?, standing }`.
A suspended account gets `403` on outbound report actions. `GET /api/shield`
returns `{ entries, saved, standing }`. State persists in
`webapp/.data/shield-state.json` (gitignored; swap `lib/shield/store.ts` for a
real database in production — routes only touch state through that module).

`GET /api/partners?partnerId=...` — partner exchange feed: verified signals
(number + network warning + engine classification only; never the user's
statement), rev-share ledger (`€0.40` per confirmed verified signal), and
removal notices the partner must act on. `POST /api/partners` with
`{ partnerId, reportId, outcome: "confirmed" | "legitimate" }`: `confirmed`
books the credit; `legitimate` voids the report, revokes its credits and issues
a false-report strike — three strikes in 90 days suspend the account and draft
a removal notice per reported number.

`GET /api/misuse` — the demo account's standing (strikes, suspension), its
reports and all drafted removal notices. `POST /api/misuse { action: "reset" }`
wipes the demo store.

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
