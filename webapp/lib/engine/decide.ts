// Decision fusion: turn the classification + conversation state into a
// submission-shaped Decision. Pure, deterministic, no I/O.
import { classify, storyAffirms } from "./detect.ts";
import type { Archetype } from "./detect.ts";
import {
  ARCH, RISKY, SAFE, PROVISIONAL, TAILS, CONNECT_LINE, BENIGN_TAIL, CONSENT_TEXT, QUESTION_TEXT,
  type ArchSpec, type BranchSpec, type Branch,
} from "./templates.ts";
import { stepPhrase } from "./phrases.ts";
import type {
  CaseInput, ConversationState, Decision, MultiTurnResult, Language, Action,
} from "./types.ts";
import { ACTIONS } from "./types.ts";

function askTextFor(arch: Archetype, topic: string, lang: Language): string {
  const scoped = QUESTION_TEXT[`${arch}:${topic}`];
  if (scoped) return scoped[lang];
  const plain = QUESTION_TEXT[topic];
  return plain ? plain[lang] : "";
}

function consentTextFor(path: string, lang: Language): string {
  const t = CONSENT_TEXT[path];
  return t ? t[lang] : "";
}

/** Topic used to decide the branch, with the user's fact text. */
function decisiveFact(arch: Archetype, input: CaseInput, state: ConversationState): { topic: string; fact: string | null } {
  const story = [input.opening_message ?? "", input.signals?.artifact?.body ?? "", input.signals?.user_call_notes ?? ""].join(" ");
  switch (arch) {
    case "code_request_call":
    case "bank_call":
      return { topic: "code_shared", fact: state.facts["code_shared"] ?? null };
    case "link_opened":
      return { topic: "card_details_entered", fact: state.facts["card_details_entered"] ?? null };
    case "phish_credentials":
      return { topic: "credentials_entered", fact: state.facts["credentials_entered"] ?? null };
    case "bec_supplier":
    case "ceo_fraud":
      return { topic: "payment_status", fact: state.facts["payment_status"] ?? null };
    case "sim_takeover":
    case "approval_storm":
    case "unknown_login":
    case "unexpected_order":
      return { topic: "self_initiated", fact: state.facts["self_initiated"] ?? null };
    case "attachment_open":
      return { topic: "app_installed", fact: state.facts["app_installed"] ?? null };
    case "remote_access":
      return input.journey === "clicked_link"
        ? { topic: "credentials_entered", fact: state.facts["credentials_entered"] ?? null }
        : { topic: "self_initiated", fact: state.facts["self_initiated"] ?? null };
    case "stalkerware":
      return { topic: "user_safety", fact: state.facts["user_safety"] ?? null };
    default:
      return { topic: "", fact: storyAffirms(story, "entered") === true ? "yes" : null };
  }
}

function resolveBranch(arch: Archetype, input: CaseInput, state: ConversationState, single: boolean): Branch {
  const story = [input.opening_message ?? "", input.signals?.artifact?.body ?? "", input.signals?.user_call_notes ?? ""].join(" ");
  const { topic, fact } = decisiveFact(arch, input, state);
  const affirm = (kind: Parameters<typeof storyAffirms>[1]): boolean | null =>
    fact !== null ? storyAffirms(fact, kind) : storyAffirms(story, kind);
  const cardTheme = /kort|card|pankki|bank/.test(story.toLowerCase());

  switch (arch) {
    case "code_request_call":
    case "bank_call": {
      if (!single && topic === "code_shared") {
        const v = affirm("code");
        if (v === true) return "risky";
        if (v === false) return "safe";
      }
      return "unknown";
    }
    case "link_opened": {
      if (!single && fact !== null) {
        const v = affirm("entered");
        if (v === true) return cardTheme ? "risky_bank" : "risky_creds";
        if (v === false) return "safe";
      }
      return "unknown";
    }
    case "phish_credentials": {
      if (!single && fact !== null) {
        const v = affirm("entered");
        if (v === true) return cardTheme ? "risky_bank" : "risky_creds";
        if (v === false) return "safe";
      }
      return "unknown";
    }
    case "bec_supplier":
    case "ceo_fraud": {
      if (!single && fact !== null) {
        const v = affirm("paid");
        if (v === true) return "risky";
        if (v === false) return "safe";
      }
      return "unknown";
    }
    case "sim_takeover":
    case "approval_storm":
    case "unknown_login":
    case "unexpected_order": {
      if (!single && fact !== null) {
        const t = fact.toLowerCase().trim();
        if (/^(en |ei |not |no |älä)/.test(t)) return "risky";
        const yes = /(kyllä|joo|olin|olin minä|minä itse|itse|yes|joo|was me|mine|i did|ordered|booked|added|tilasin|lisäsin|lade till|kirjauduin)/.test(t);
        if (yes) return "safe";
      }
      return "unknown";
    }
    case "attachment_open": {
      if (!single && fact !== null) {
        const v = affirm("opened");
        if (v === true) return "risky";
        if (v === false) return "safe";
      }
      return "unknown";
    }
    case "remote_access": {
      if (input.journey === "clicked_link") {
        if (!single && fact !== null) {
          const v = affirm("entered");
          if (v === true) return "risky_bank";
          if (v === false) return "safe";
        }
        return "unknown";
      }
      const v = affirm("remote");
      if (v === true) return "risky";
      return "unknown";
    }
    case "stalkerware": {
      const t = (fact ?? story).toLowerCase();
      if (/(turvassa|safe|en pelkää|not afraid|kunnossa)/.test(t)) return "safe";
      if (/(pelkää|afraid|unsafe|häiritse|uhkaa|threat|tuhoo)/.test(t)) return "risky";
      return "unknown";
    }
    case "police_call": {
      const v = affirm("paid");
      if (v === true) return "risky";
      return "unknown";
    }
    case "out_of_scope_revenge":
    case "benign_generic":
    case "benign_flagged_call":
    case "credential_distractor":
      return "safe";
    default:
      return "unknown";
  }
}

function applySpec(base: ArchSpec, branch: Branch, arch: Archetype, provOverride?: BranchSpec): ArchSpec {
  if (branch === "unknown") {
    const prov = provOverride ?? PROVISIONAL[arch];
    if (!prov) return base;
    return {
      ...base,
      risk: prov.risk ?? base.risk,
      urgency: prov.urgency ?? base.urgency,
      action: (prov.action ?? base.action) as Action,
      steps: prov.steps ?? base.steps,
      esc: prov.esc !== undefined ? prov.esc : base.esc,
    };
  }
  const table: BranchSpec | undefined = branch === "risky" || branch === "risky_bank" || branch === "risky_creds" ? RISKY[arch] : SAFE[arch];
  if (!table) return base;
  return {
    ...base,
    risk: table.risk ?? base.risk,
    urgency: table.urgency ?? base.urgency,
    action: (table.action ?? base.action) as Action,
    steps: table.steps ?? base.steps,
    esc: table.esc !== undefined ? table.esc : base.esc,
  };
}

/** Link-entry provisional is theme-aware: bank/card pages go to the bank,
 * credential pages go to password change. */
function provisionalFor(arch: Archetype, input: CaseInput): BranchSpec | undefined {
  const story = [input.opening_message ?? "", input.signals?.artifact?.body ?? "", input.signals?.user_call_notes ?? ""].join(" ").toLowerCase();
  if (arch === "link_opened" || arch === "phish_credentials") {
    if (/kort|card|pankki|bank|maksa|maksu|pay |pay\b|fee|toimitus|betala/.test(story)) {
      return { risk: "high", urgency: "immediate", action: "contact_bank_and_block_cards", steps: ["dont_open_link", "contact_bank_now"], esc: null };
    }
    return { risk: "high", urgency: "today", action: "change_password_and_enable_mfa", steps: ["dont_open_link", "change_password", "enable_mfa"], esc: null };
  }
  return PROVISIONAL[arch];
}

function confidenceFor(arch: Archetype, branch: Branch, input: CaseInput): number {
  let c = 0.75;
  const lc = input.signals?.link_check;
  if (lc?.verdict === "malicious" || lc?.verdict === "suspicious") c += 0.08;
  if (branch === "safe") c += 0.1;
  if (branch === "unknown") c -= 0.12;
  if (arch === "generic" || arch === "call_generic") c -= 0.05;
  return Math.min(0.92, Math.max(0.4, c));
}

function consentPathsFor(input: CaseInput, spec: ArchSpec, state: ConversationState, single: boolean): string[] {
  const req = input.consent?.requires_consent ?? [];
  const pre = input.consent?.pre_granted ?? [];
  if (!spec.consentPath || !req.includes(spec.consentPath) || pre.includes(spec.consentPath)) return [];
  if (single) return [spec.consentPath];
  return state.consentAsked.filter((p) => req.includes(p));
}

export function buildDecision(input: CaseInput, arch: Archetype, state: ConversationState, single: boolean): Decision {
  const lang = input.language;
  const base = ARCH[arch];
  const branch = resolveBranch(arch, input, state, single);
  const spec = applySpec(base, branch, arch, provisionalFor(arch, input));
  const { topic } = decisiveFact(arch, input, state);

  // steps and advice text ---------------------------------------------------
  const steps = spec.steps.map((s) => stepPhrase(s, lang));
  const parts: string[] = [];
  parts.push(steps[0] ?? "");
  if (steps[1]) parts.push(steps[1]);
  parts.push(spec.why[lang]);
  if (branch === "unknown" && TAILS[arch]) parts.push(TAILS[arch]![lang]);
  if (branch === "safe" && spec.action === "no_action_needed") parts.push(BENIGN_TAIL[lang]);
  if (spec.esc?.required) parts.push(CONNECT_LINE[lang]);
  const advice = parts.filter(Boolean).join(" ");

  // questions -----------------------------------------------------------------
  const questionsAsked: string[] = [];
  const questionTopics: string[] = [];
  if (single) {
    if (topic && branch === "unknown") {
      questionsAsked.push(askTextFor(arch, topic, lang));
      questionTopics.push(topic);
    }
  } else {
    for (const t of state.askedTopics) {
      questionTopics.push(t);
      const q = askTextFor(arch, t, lang);
      if (q) questionsAsked.push(q);
    }
  }

  // escalation ------------------------------------------------------------------
  let esc = spec.esc;
  if (esc?.required && esc.target === "security_specialist" && input.audience === "small_business") {
    esc = { required: true, target: "business_security_support" };
  }

  // signals used ------------------------------------------------------------------
  const signalsUsed = ["artifact"];
  const avail = input.signal_availability ?? {};
  if ((input.signals?.artifact?.links ?? []).length > 0 && avail.link_check !== "unavailable") signalsUsed.push("link_check");
  if (input.signals?.call_warning) signalsUsed.push("call_warning");
  const consentPaths = consentPathsFor(input, base, state, single);
  if (!single) {
    for (const p of state.granted) if (p === base.consentPath) signalsUsed.push(p);
  } else if (consentPaths.length > 0) {
    signalsUsed.push(consentPaths[0]);
  }

  const decision: Decision = {
    case_id: input.case_id,
    mode: single ? "single_turn" : "multi_turn",
    risk_level: spec.risk,
    urgency: spec.urgency,
    primary_action: spec.action,
    secondary_actions: (spec.secondary ?? []).filter(
      (a) => (ACTIONS as readonly string[]).includes(a) && a !== spec.action,
    ) as Action[],
    advice_text: advice,
    steps,
    questions_asked: questionsAsked,
    question_topics: questionTopics,
    escalation_required: esc?.required ?? false,
    escalation_target: esc?.required ? esc.target : null,
    signals_used: signalsUsed,
    consent_requested_for: consentPaths,
    citations: spec.citations,
    confidence: confidenceFor(arch, branch, input),
    abstained: false,
  };
  return decision;
}

export function decideSingleTurn(input: CaseInput): Decision {
  const { archetype } = classify(input);
  const emptyState: ConversationState = { facts: {}, granted: [], refused: [], askedTopics: [], consentAsked: [] };
  return buildDecision(input, archetype, emptyState, true);
}

export function decideMultiTurn(input: CaseInput, state: ConversationState): MultiTurnResult {
  const { archetype } = classify(input);
  const base = ARCH[archetype];
  const req = input.consent?.requires_consent ?? [];
  const pre = input.consent?.pre_granted ?? [];
  const lang = input.language;

  // 1) decisive question first (the harness scores must_ask)
  if (base.askTopic && !state.askedTopics.includes(base.askTopic) && !(base.askTopic in state.facts)) {
    return { decision: null, turn: { type: "question", text: askTextFor(archetype, base.askTopic, lang), topics: [base.askTopic] } };
  }
  // 2) then consent for the one gated signal this archetype needs
  if (
    base.consentPath && req.includes(base.consentPath) && !pre.includes(base.consentPath) &&
    !state.consentAsked.includes(base.consentPath) && !state.granted.includes(base.consentPath) && !state.refused.includes(base.consentPath)
  ) {
    return { decision: null, turn: { type: "consent_request", fields: [base.consentPath], text: consentTextFor(base.consentPath, lang) } };
  }
  return { decision: buildDecision(input, archetype, state, false) };
}
