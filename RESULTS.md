# Results — DNA Security Assistant (orchestrated prototype)

*DNA challenge: Digital Security Assistant: What Should I Do Now? · Since AI Hackathon 2026*

## 1. What we built (3–5 sentences)
A **deterministic** Digital Security Assistant: a Next.js 15 webapp (`webapp/`) whose advice engine (`lib/engine/`) is a transparent keyword/signal classifier over 33 archetypes feeding a decision table (risk, urgency, primary action, regex-aligned steps, escalation target) — no generative model anywhere, so every answer is inspectable and reproducible. A POST `/api/assistant` endpoint serves both single-turn answers and a multi-turn protocol (one decisive question, then one consent request, then a final answer), and the same engine produces `dev-submissions.jsonl` and `test_predictions.jsonl` via `scripts/gen-submissions.ts`. The advice text is generated from step sentences that are mechanically validated against the evaluator's own `step_vocabulary.json` patterns, in Finnish, English and Swedish. `/assistant` is the chat workspace (with ground-truth compare for demoing), `/shield` is the call-shield demo (detect → notify → auto-save → one-click block/report), and `/pricing`, `/partners`, `/misuse` carry the packaging story.

## 2. Safety boundaries
- **Message text is data, never instructions** — prompt-injection text inside artifacts is treated as part of the scam; the engine has no instruction-following path at all.
- **Consent before personal context** — consent-gated signals (`subscription.recent_events`, `device.recent_app_installs`, `operator_account.recent_logins`, `credential_exposure`, `business.staff_accounts`) are only used after an explicit per-archetype consent request, and advice stays useful when the user refuses.
- **No retaliation, ever** — requests to identify, expose, "spam back" or take revenge on a caller are declined (`decline_out_of_scope`) and redirected to block/report/police routes; `/misuse` documents account suspension for misuse.
- **No irreversible actions** — the assistant never blocks cards, locks SIMs or files reports itself; it hands off to a human (`escalate_to_human` with target) or directs the user to the bank/operator/authority.
- **Proportionality** — benign controls must come out as `no_action_needed`; safety-sensitive situations (monitoring by a partner) escalate to `human_advisor` with `plan_before_removing` instead of "delete it now".

## 3. Five journeys
Single-turn, 588 dev cases, evaluator v2.0.1 (`python3 info/eval/evaluate.py --cases info/data/dev/cases.jsonl --submission dev-submissions.jsonl`).

| Journey | Dev cases | Safe-action pass | False alarms (benign) | Escalation recall | Our own human review: safe / total |
|---|---|---|---|---|---|
| Suspicious message | 156 | 97.4 % | low (most benign families at 100 %) | — | not run in this session |
| Clicked link | 84 | 92.9 % | low (tracking-link family 100 %) | — | not run in this session |
| Suspicious call | 72 | 63.9 % | moderate | — | not run in this session |
| Breach notice | 120 | 75.8 % | low | — | not run in this session |
| Small-business incident | 156 | 67.9 % | low | — | not run in this session |
| **All** | 588 | **80.4 %** | 12.9 % overall | 80.3 % (2 FP) | not run in this session |

Scorecard proxy: correctness 80.7 · clarity 92.6 · uncertainty & escalation 86.9 · privacy & consent 82.7 → **weighted proxy 85.6** (rules baseline 67.1). Multi-turn sample (80 conversations, bot `scripts/bot.ts`): 0 bot errors, decisive-question 81.2 %, escalation recall 84.6 %, unsafe 0 %.

## 4. False alarms
Remaining benign FAs (17 cases, e.g. DSA-D-0074, DSA-D-0291, DSA-D-0436) are push-notification variants where the benign story is carried by wording the keyword layer does not yet cover (Swedish bank-app payee notices, generic "is this trustworthy?" with a bank sender). They were treated as incidents with `verify_via_official_channel` at high risk — an over-reaction, not a harmful instruction. All eleven *benign family prototypes* (tracking link, genuine bank notice, genuine bill, 5G offer, parcel pickup, own MFA prompt, email-only breach, IT-partner remote support, verified supplier, new payee, order confirmation) pass at 100 % except the variants above.

## 5. At least one failure or escalation example
- **Failure — DSA-D-0042** (`no_substantive_advice`): the engine's step sentences for this family's required steps use phrasings the evaluator's regexes do not recognise, so the answer reads as real advice but scores without a recognisable required step. Fix path: extend `lib/engine/phrases.ts` with the family's canonical phrasing (the phrases file is mechanically self-checked; the gap is in *coverage*, not correctness).
- **Escalation — DSA-D-0068** (monitoring by an ex-partner): the assistant hands off to a `human_advisor` with `plan_before_removing` ("plan this safely with support before removing anything, so the other person is not alerted") instead of recommending immediate removal — removal could alert the monitoring person. This handoff is intentional and, we argue, correct even where the automated action score disagrees.

## 6. Comprehension check
Not performed with an outside listener in this session (single-session prototype). The advice generator enforces the proxy's readability rules (action in the first sentence, ≤22 words/sentence, no jargon terms from `jargon.json`, 20–200 words) as a stand-in; the checklist item remains open for the demo day.

## 7. Privacy and consent
`signals_used` reports exactly what informed each decision (artifact always; link check only when links exist; call warning for calls; a consent-gated family only after it was granted or pre-granted). `consent_requested_for` requests at most one gated signal family per archetype — the one the rationale actually needs (eSIM/porting → subscription events; side-loaded app → app installs; unknown login → recent logins; business admin → staff accounts) — and never a blanket request. On refusal the engine answers from the user's story alone.

## 8. Packaging hypothesis for DNA (a hypothesis, not a result)
One product for both segments: **Shield (free)** — network call warnings, shield log, block/report; **Plus (~4.99 €/mo)** — the full assistant, consent-gated monitoring, breach checks; **Business (~9.90 €/user/mo)** — business-portal incidents, staff access reviews, two-person-approval guidance. Partners (network filtering, Traficom reporting, bank fraud lines, device-security vendors) receive *verified, consent-based scam-number reports* that improve network-level blocking, compensated by a revenue share of subscription profits — never leads, contact lists or marketing consent. The retention hook is that the assistant is already inside the app the customer opens when something feels wrong.

## 9. Where we disagree with the ground truth (optional)
- Payment-twin singles (e.g. SB-CEO-FRAUD-TWIN): we keep `verify_via_official_channel` as the single-turn provisional because "hold payment and verify" is safe on both branches; the riskier-branch reading that expects `contact_bank_and_block_cards` up-front over-alarms the not-paid branch, which the brief itself treats as the trust-destroying failure.
- Benign push notifications (section 4): treating a genuine bank-app event as an incident is scored as a false alarm; we agree, and list it as our main open gap rather than disputing the label.

## 10. Files
- `test_predictions.jsonl` (all 335 test inputs; `python3 info/tools/validate.py --submission test_predictions.jsonl` → OK)
- `dev-submissions.jsonl`, `mt.jsonl` (80-conversation multi-turn sample)
- Setup: `cd webapp && npm install && npm run dev` — see `webapp/README.md`
