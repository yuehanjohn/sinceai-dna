# Integration contract — FireBack webapp

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
`block_device | save_number | block_and_save | fire_back | report_operator | report_traficom | evidence_pack`.
`fire_back` is the pivot: it blocks and saves the number, creates the operator
report + draft, and queues one fan-out `Submission` per channel in
`fanoutPlan(harasser)` — 15 targets (1 `marketplace_listing`, 8 `real_estate`,
6 `sales`), 20 when the event is tagged as harassment (`+ 5 harasser_site`).
Each submission carries the form filled by
`lib/shield/channels.ts#fillForm` and one `weak_lead` credit line of `€0.05`;
`deliverAt` is staggered, and `status` flips queued → delivered lazily by
`promoteDue()` on `GET`.
Outbound report actions generate the matching structured draft (operator /
Traficom / police, in the event's language) server-side from the engine
decision. Response:
`{ entry: { action, number, eventId, status, at }, reportId?, draft?, submissions?, standing }`
where `submissions` (an array of `Submission`) is present on `fire_back`.
A suspended account gets `403` on outbound report actions, `fire_back`
included. `GET /api/shield` returns
`{ entries, saved, submissions, fanout, standing }`, promoting due deliveries
first; `?eventId=` narrows `submissions`/`fanout` to one event and `fanout` is
`{ total, queued, delivered, purged, byKind, hasHarasserExtra }`. State persists
in `webapp/.data/shield-state.json` (gitignored; swap `lib/shield/store.ts` for
a real database in production — routes only touch state through that module).

`GET /api/partners?partnerId=...` — partner console view, shaped by the
partner's `kind` (`"shield" | "weak_lead" | "marketplace"`). Shield partners see
the verified-signal exchange (number + network warning + engine classification
only; never the user's statement), the rev-share ledger (`€0.40` per confirmed
verified signal, ledger basis `verified_signal`; `−€0.40` as `revocation` when
voided) and the removal notices they must act on. Weak-lead partners
additionally see the fired-back numbers sent to them, `weakLeadShareEur`
(`€0.05`) and their credit lines (basis `weak_lead`, `weak_lead_revocation`).
Marketplace partners see `leadCommissionOwedEur`. `POST /api/partners` with
`{ partnerId, reportId, outcome: "confirmed" | "legitimate" }` (shield kind
only): `confirmed` books the credit; `legitimate` voids the report, revokes its
credits and issues a false-report strike — three strikes in 90 days suspend the
account, purge every fired-back submission and draft a removal notice per
reported number to the shield partners **and every fan-out channel holding it**.
Suspension also pulls back the account's marketplace privileges: every active
lead consent is withdrawn, its lead is voided economically (user reward and
partner commission both revoked) and the holding partner receives a
consent-withdrawal purge notice.

`GET /api/partners/feed` — authenticated partner sync feed. Header
`X-Partner-Key` (seed keys in `lib/shield/partners.ts`; rotated keys are
store-backed — rotate via `POST /api/partners/feed/rotate` with the current
key; it returns the new key once and the old key stops working immediately).
`?since=<cursor>` returns a delta and every response carries a fresh `cursor`:
signals, retractions, notices, leads, lead revocations, weak leads and weak-lead
purges are all filtered by their event time against the cursor; omit `since` for
a full snapshot. Shield-kind partners receive verified scam signals (number +
network warning + engine classification only), retractions of voided reports and
removal notices to purge. Weak-lead-kind partners receive `weakLeads` (the
fired-back number with `payload` = the form as filled, `shareEur` = `€0.05`) and
`weakLeadPurges` when a submission is pulled back. Marketplace-kind partners
receive ONLY leads the user explicitly consented to share, plus lead revocations
when consent is withdrawn. Every kind also receives its `notices`.

`GET /api/leads` — the user's opt-in lead consents, delivered leads and reward
total. `POST /api/leads` with `{ action: "consent", partnerId, number }` shares
the USER'S OWN number with one marketplace partner for offers — the *strong
lead*: €2.00 reward to the user, €6.00 commission from the partner; one active
consent per partner — or `{ action: "revoke", consentId }` withdraws consent:
the lead is voided economically and the partner receives a consent-withdrawal
purge notice (GDPR Art. 7(3), 17(1)(b), 19). A suspended account gets `403` on
`consent` — no new lead pipelines while suspended — while `revoke` stays
available. The three partner kinds are strictly separate: a marketplace partner
cannot consume the shield exchange or the fan-out weak leads, a shield partner
cannot receive leads, and a weak_lead partner only ever receives fired-back
numbers.

`GET /api/misuse` — the demo account's standing (strikes, suspension), its
reports, its fired-back submissions (with `status`/`purgedAt` so a suspension
is visible) and all drafted removal notices. `POST /api/misuse { action: "reset" }`
wipes the demo store.

## Conventions

- TypeScript strict, App Router, Tailwind v4 with the CSS vars in `app/globals.css`
  (`--surface`, `--border`, `--muted`, `--accent`, `--success`, `--warning`, `--error`).
- No new npm dependencies. English UI chrome; `advice_text` is rendered in the
  case's language as returned by the engine.
- Pages: `/` landing, `/assistant` chat, `/shield` call-shield fire-back demo,
  `/offers` opt-in strong-lead marketplace, `/pricing`, `/partners`, `/misuse`.
  Shared nav lives in `app/layout.tsx`.
- Data files the engine reads at runtime are NOT used; the engine is
  self-contained (patterns compiled into `detect.ts`).
- The pivot is a product layer: `lib/engine/` is untouched by the fire-back
  fan-out and the evaluator scores are unchanged; the shield routes consume the
  engine's `Decision` rather than reshaping it.
- Product tone: protective, honest. The assistant only advises; FireBack
  blocks, reports, escalates — and fires the caller's number into the partner
  forms. The engine's refusal route still declines requests to identify, expose
  or retaliate (`decline_out_of_scope`); acting is FireBack's job, not the
  assistant's. See `/misuse`.
