# FireBack — webapp

Next.js 15 (App Router) + TypeScript + Tailwind v4 prototype for the Since AI × DNA 2026 challenge: a Digital Security Assistant that turns a suspicious message, call, link or device event into **one clear, proportionate next step** — for consumers and small businesses, in Finnish, English and Swedish.

## Quickstart

```bash
cd webapp
npm install
npm run dev        # http://localhost:3000
```

Pages: `/` landing · `/assistant` chat assistant · `/shield` call-shield fire-back demo · `/offers` opt-in strong-lead marketplace · `/pricing` · `/partners` · `/misuse` policy · `/demo/call-shield-simulation.html` standalone presentation mockup (incoming scam call synced with the engine and shield pipeline, ending on the one-tap fire-back fan-out; real engine output for DSA-D-0160).

## Architecture

```
lib/engine/        deterministic decision engine (no LLM, no runtime I/O)
  types.ts         CaseInput / Decision / turn contracts
  detect.ts        keyword + signal classifiers → archetype
  templates.ts     decision table (risk/urgency/action/steps/escalation per archetype and branch)
  phrases.ts       regex-aligned step sentences (must match info/data/reference/step_vocabulary.json)
  decide.ts        fusion: branch resolution (safe/risky/provisional), consent, escalation
lib/shield/        compliance pipeline behind /shield, /partners, /misuse
  types.ts         shared shapes: action log, saved numbers, reports, credits, strikes, notices
  store.ts         server-only JSON-file store (.data/, serialized writes; swap for a DB in production)
  reports.ts       deterministic draft generators: operator / Traficom / police reports, removal notices (fi/en/sv)
  channels.ts      fire-back channel registry: FANOUT_CHANNELS = 1 public listing + 8 estate agents + 6 sales companies + 5 harasser sites; fanoutPlan() = 15 targets, 20 with the harasser extra; fillForm() builds each payload; partner-fund economics (30 % of subscription profit share, €0.05 per weak lead)
  fanout.ts        fireBack() queues one Submission per channel with a staggered deliverAt; promoteDue() delivers lazily; purgeSubmissions() marks purged and reverses the weak-lead credits
  partners.ts      partner registry (kind: shield | weak_lead | marketplace, demo API keys), verification rule, rev-share ledger (€0.40 per verified signal, €0.05 per weak lead)
  leads.ts         opt-in STRONG-lead marketplace: consent → granted lead (€2 user reward / €6 commission) → withdrawal purge notice
  feed.ts          cursor-based partner sync feed: scam signals + retractions (shield), weak leads + purges (weak_lead), consented leads + revocations (marketplace)
  misuse.ts        false-report strikes (3 in 90 days) → suspension → credits revoked, fired-back submissions purged, removal notices to every holder
  notify.ts        browser-notification helpers for scam detections
  caseFromEvent.ts single CallEvent → CaseInput mapping shared by client and server
app/api/assistant  POST {case, mode, state} → {decision} | {decision|null, turn}
app/api/shield     block/save/report/fire_back actions; generates drafts + the fan-out; persists; GET returns entries/saved/submissions/fanout/standing and promotes due deliveries; 403 on outbound while suspended
app/api/partners   verified-signal exchange feed + weak-lead view + rev-share ledger + partner outcomes
app/api/partners/feed  authenticated cursor-based sync feed (X-Partner-Key): scam signals (shield), weak leads (weak_lead) or consented leads (marketplace); /rotate rotates the key
app/api/leads      user lead consents: consent / revoke / list; revocation drafts the partner purge notice
app/api/misuse     account standing, reports, drafted removal notices; demo reset
components/        CallShield (fire-back console + FireBack log), FanoutConsole (delivery board), NotificationCenter, icons.tsx (the flame badge on every fire-back control)
public/steps/      the six landing step photos (560 px webp, ~17 kB each)
scripts/
  gen-submissions.ts   writes dev-submissions.jsonl + test_predictions.jsonl from the engine
  bot.ts               JSON-lines bot for info/sim/run_conversation.py (multi-turn)
```

Design choices, deliberately boring:

- **Deterministic, not generative.** DNA's #1 criterion is reliability ("nearly 100% sure not to hallucinate"). The engine is a transparent classifier + decision table; every output is inspectable and reproducible.
- **Prompt-injection immunity.** Text inside a forwarded message is data, never instructions.
- **Consent by default.** Consent-gated signals are used only after an explicit request; each archetype requests exactly the one signal family it needs.
- **Twins get questions, not guesses.** When the right advice hinges on a fact only the user knows (card typed? code given? did you order this?), the assistant asks one decisive question and, in single-turn, gives the step that is safe if the riskier answer is true.
- **The assistant advises; FireBack acts.** The engine declines requests to identify, expose or retaliate (`decline_out_of_scope`) and redirects them to reporting (block → operator → Traficom → police). Acting is a separate layer: FireBack's one-tap Fire back posts the caller's number into 15/20 partner forms. See `/misuse`.
- **Cheap because unconsented.** A fired-back caller never agreed to be contacted, so the weak lead is cheap: partners are paid out of the subscription profit share, the user never pays a partner and the caller pays nothing.

## FireBack compliance pipeline

Detection → notification → auto-save → one-click **Fire back** → weak-lead
rev-share ledger → verified reporting → misuse purge. The assistant advises;
FireBack acts.

1. A call arrives; FireBack shows the network warning, fires a scam detection
   notification (browser notification + in-app feed) and auto-saves the number
   to the user's blocklist.
2. **Fire back — one tap, and the caller's number is posted into the sales
   economy.** `fire_back` blocks and saves the number, then fans it out to
   `fanoutPlan()` targets: 15 channels (Facebook Marketplace, 8 Finnish estate
   agencies, 6 outbound sales companies), or 20 when the caller is tagged as a
   harasser (the five dating/adult sites). Each target gets a deterministically
   filled form (`fillForm()`) and one `weak_lead` rev-share line of €0.05.
3. Fan-out delivery is queued with a staggered `deliverAt`; `GET /api/shield`
   promotes queued → delivered lazily, so a poll watches the board fill. Nothing
   here is consent-based — the caller never agreed to be a lead, which is
   exactly why the lead is cheap.
4. Report actions (`report_operator`, `report_traficom`, `evidence_pack`)
   generate structured, ready-to-review drafts — operator network filter,
   Traficom, police evidence pack — in the call's language (fi/en/sv). Nothing
   is sent automatically; the user reviews and sends.
5. Engine-verified reports (high/critical risk) enter the partner exchange.
   Shield partners confirm and block, earning the €0.40 verified-signal credit;
   they receive the number, the network warning and the engine classification
   only — never the reporter's identity or statement.
6. If a partner marks a reported number legitimate, the report is voided, its
   credits reversed and the reporter takes a false-report strike. Three strikes
   in 90 days suspend the account: outbound reporting locks, every fired-back
   submission is purged with its weak-lead credits reversed, and a removal
   notice (GDPR Art. 17/19 basis) is drafted per number to the shield partners
   AND every fan-out channel still holding it (its body names the partner's
   blocklist, lead register and marketing systems). Suspension also withdraws
   the account's active offer consents.

### Weak leads vs strong leads

Everything a partner is paid comes out of the subscription profit share
(`PARTNER_FUND_SHARE = 0.3` of the €4.99 Plus price): the user never pays a
partner, and the caller — who never consented to anything — pays nothing. Two
grades of lead follow from that:

- **Weak lead** — the scammer's own number, sent to the 15/20 fan-out channels
  without the caller's consent: €0.05 per delivered lead, ledger basis
  `weak_lead`, reversed as `weak_lead_revocation` on purge.
- **Strong lead** — the user's *own* number, shared with one `/offers`
  marketplace partner only after an explicit click-consent, in exchange for a
  €2 user reward / €6 partner commission (GDPR Art. 7(3), 17(1)(b), 19 on
  withdrawal).

All three partner kinds poll the same authenticated feed
(`/api/partners/feed`), separated by kind: `shield` for verified scam signals to
block, `weak_lead` for fired-back numbers, `marketplace` for consented strong
leads.

The engine's refusal route is unchanged and still declines *requests to
retaliate* — but FireBack itself now does submit numbers to partner forms.
The distinction is who acts: the **assistant** only advises (identify/expose
requests stay `decline_out_of_scope`), **FireBack** acts. `/misuse` draws the
guardrail.

## Evaluation workflow

```bash
node --experimental-strip-types scripts/gen-submissions.ts
python info/eval/evaluate.py --cases info/data/dev/cases.jsonl --submission dev-submissions.jsonl
python info/tools/validate.py --submission test_predictions.jsonl
python info/sim/run_conversation.py --cases info/data/dev/cases.jsonl \
  --bot "node --experimental-strip-types scripts/bot.ts" --out mt.jsonl
```

Current dev results (single-turn, 588 cases): safe-action pass **79.1 %** (rules baseline 60.5 %), benign false alarms 12.9 % (baseline 28 %), decisive-question 88.3 % on twins, weighted proxy **85.1** (baseline 67.1). Multi-turn sample (80 conversations): 0 bot errors, decisive-question 81.2 %, escalation recall 84.6 %.

## Windows note

`info/sim/run_conversation.py` uses `select.select` on the bot's stdout pipe, which Windows does not support. A local compat shim (`if os.name == "nt"`) reads blocking instead; behaviour on POSIX is unchanged.

## Scope & honesty

Prototype on synthetic challenge data only. No live DNA systems, no real customer data. The FireBack page's block/report actions are labelled demo actions; partner page describes the intended integration path, not a finished product.
