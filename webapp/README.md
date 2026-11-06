# DNA Security Assistant — webapp

Next.js 15 (App Router) + TypeScript + Tailwind v4 prototype for the Since AI × DNA 2026 challenge: a Digital Security Assistant that turns a suspicious message, call, link or device event into **one clear, proportionate next step** — for consumers and small businesses, in Finnish, English and Swedish.

## Quickstart

```bash
cd webapp
npm install
npm run dev        # http://localhost:3000
```

Pages: `/` landing · `/assistant` chat assistant · `/shield` call-shield demo · `/pricing` · `/partners` · `/misuse` policy.

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
  partners.ts      partner registry, verification rule, rev-share ledger (€0.40 per verified signal)
  misuse.ts        false-report strikes (3 in 90 days) → suspension → removal notices
  notify.ts        browser-notification helpers for scam detections
  caseFromEvent.ts single CallEvent → CaseInput mapping shared by client and server
app/api/assistant  POST {case, mode, state} → {decision} | {decision|null, turn}
app/api/shield     block/save/report actions; generates report drafts; persists; 403 on outbound while suspended
app/api/partners   verified-signal exchange feed + rev-share ledger + partner outcomes
app/api/misuse     account standing, reports, drafted removal notices; demo reset
scripts/
  gen-submissions.ts   writes dev-submissions.jsonl + test_predictions.jsonl from the engine
  bot.ts               JSON-lines bot for info/sim/run_conversation.py (multi-turn)
```

Design choices, deliberately boring:

- **Deterministic, not generative.** DNA's #1 criterion is reliability ("nearly 100% sure not to hallucinate"). The engine is a transparent classifier + decision table; every output is inspectable and reproducible.
- **Prompt-injection immunity.** Text inside a forwarded message is data, never instructions.
- **Consent by default.** Consent-gated signals are used only after an explicit request; each archetype requests exactly the one signal family it needs.
- **Twins get questions, not guesses.** When the right advice hinges on a fact only the user knows (card typed? code given? did you order this?), the assistant asks one decisive question and, in single-turn, gives the step that is safe if the riskier answer is true.
- **Refusal route.** Requests to identify, expose or retaliate against a caller are declined and redirected to reporting (block → operator → Traficom → police). See `/misuse`.

## Call Shield compliance pipeline

Detection → notification → one-click action → verified reporting → partner
exchange, with misuse enforcement built in:

1. A call arrives; the shield shows the network warning and fires a scam
   detection notification (browser notification + in-app feed) and auto-saves
   the number.
2. One click blocks the number on the device and saves it with its evidence.
3. Report actions generate structured, ready-to-review drafts — operator
   network filter, Traficom, police evidence pack — in the call's language
   (fi/en/sv). Nothing is sent automatically; the user reviews and sends.
4. Engine-verified reports (high/critical risk) enter the partner exchange.
   Partners confirm and block the number, earning the revenue-share credit;
   they never see the reporter's identity or statement.
5. If a partner verifies a reported number as legitimate, the report is voided,
   its credits revoked and the reporter takes a false-report strike. Three
   strikes in 90 days suspend the account: outbound reporting locks, and a
   removal notice (GDPR Art. 17/19 basis) is auto-drafted to every partner for
   every number the account reported.

The retaliation features this pipeline deliberately does NOT have (public
shaming, lead-form submissions, service sign-ups) are listed on `/misuse` and
enforced by the engine's refusal route.

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

Prototype on synthetic challenge data only. No live DNA systems, no real customer data. The shield page's block/report actions are labelled demo actions; partner page describes the intended integration path, not a finished product.
