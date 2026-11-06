"use client";

import { useRef, useState } from "react";
import ChatPanel, { type ChatMessage } from "@/components/ChatPanel";
import DecisionCard, { actionLabel } from "@/components/DecisionCard";
import { runAssistant, type Mode } from "@/lib/client";
import { SAMPLE_CASES, type SampleCase } from "@/lib/samples";
import type {
  AssistantTurn,
  CaseInput,
  ConversationState,
  Decision,
} from "@/lib/engine/types";

const EMPTY_STATE: ConversationState = {
  facts: {},
  granted: [],
  refused: [],
  askedTopics: [],
  consentAsked: [],
};

function mergeTopics(state: ConversationState, topics: string[]): ConversationState {
  return {
    ...state,
    askedTopics: [...new Set([...state.askedTopics, ...topics])],
  };
}

function mergeConsent(
  state: ConversationState,
  fields: string[],
): ConversationState {
  return {
    ...state,
    consentAsked: [...new Set([...state.consentAsked, ...fields])],
  };
}

function caseFromJson(raw: string): CaseInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON — check the pasted case.");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Case JSON must be an object.");
  }
  const c = parsed as Record<string, unknown>;
  if (typeof c.case_id !== "string" || typeof c.journey !== "string") {
    throw new Error("Case JSON needs at least case_id and journey.");
  }
  if (typeof c.signals !== "object" || c.signals === null) {
    throw new Error("Case JSON needs a signals object.");
  }
  return parsed as CaseInput;
}

export default function AssistantPage() {
  const [mode, setMode] = useState<Mode>("multi_turn");
  const [caseData, setCaseData] = useState<CaseInput | null>(null);
  const [activeSample, setActiveSample] = useState<SampleCase | null>(null);
  const [pasted, setPasted] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<ConversationState | null>(
    null,
  );
  const [pendingTopics, setPendingTopics] = useState<string[]>([]);
  const [awaitingConsent, setAwaitingConsent] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(true);
  const nextId = useRef(1);

  const pushMessage = (message: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { id: nextId.current++, ...message }]);
  };

  const applyTurn = (turn: AssistantTurn) => {
    pushMessage({
      role: "assistant",
      kind: turn.type === "question" ? "question" : "consent",
      text: turn.text,
      topics: turn.type === "question" ? turn.topics : undefined,
      fields: turn.type === "consent_request" ? turn.fields : undefined,
    });
    if (turn.type === "question") {
      setPendingTopics(turn.topics);
      setAwaitingConsent(false);
      setConversation((prev) => mergeTopics(prev ?? EMPTY_STATE, turn.topics));
    } else {
      setPendingTopics([]);
      setAwaitingConsent(true);
      setConversation((prev) => mergeConsent(prev ?? EMPTY_STATE, turn.fields));
    }
  };

  const callAssistant = async (
    body: Parameters<typeof runAssistant>[0],
  ) => {
    setBusy(true);
    setError(null);
    try {
      const res = await runAssistant(body);
      if (res.decision) {
        setDecision(res.decision);
        setPendingTopics([]);
        setAwaitingConsent(false);
      } else if (res.turn) {
        applyTurn(res.turn);
      } else {
        setError("The assistant returned no decision and no follow-up turn.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const startConversation = (
    input: CaseInput,
    nextMode: Mode,
    sample: SampleCase | null,
  ) => {
    setCaseData(input);
    setActiveSample(sample);
    setMessages(
      input.opening_message
        ? [
            {
              id: nextId.current++,
              role: "assistant",
              kind: "text",
              text: input.opening_message,
            },
          ]
        : [],
    );
    setConversation(nextMode === "multi_turn" ? EMPTY_STATE : null);
    setPendingTopics([]);
    setAwaitingConsent(false);
    setDecision(null);
    setError(null);
    void callAssistant({ case: input, mode: nextMode });
  };

  const loadSample = (index: number) => {
    const sample = SAMPLE_CASES[index];
    if (sample) startConversation(sample, mode, sample);
  };

  const loadPasted = () => {
    try {
      const input = caseFromJson(pasted);
      startConversation(input, mode, null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    if (caseData) startConversation(caseData, nextMode, activeSample);
  };

  const onSend = (text: string) => {
    const topics = pendingTopics;
    pushMessage({ role: "user", kind: "text", text });
    setPendingTopics([]);
    const state = mergeTopics(conversation ?? EMPTY_STATE, topics);
    const withFacts: ConversationState = {
      ...state,
      facts: { ...state.facts, ...Object.fromEntries(topics.map((t) => [t, text])) },
    };
    setConversation(withFacts);
    void callAssistant({
      case: caseData as CaseInput,
      mode: "multi_turn",
      state: withFacts,
    });
  };

  const onConsent = (fields: string[], granted: boolean) => {
    setAwaitingConsent(false);
    pushMessage({
      role: "user",
      kind: "text",
      text: granted
        ? `Allowed access to: ${fields.join(", ")}`
        : `Refused access to: ${fields.join(", ")}`,
    });
    const base = conversation ?? EMPTY_STATE;
    const state: ConversationState = {
      ...mergeConsent(base, fields),
      granted: granted ? [...new Set([...base.granted, ...fields])] : base.granted,
      refused: granted ? base.refused : [...new Set([...base.refused, ...fields])],
    };
    setConversation(state);
    void callAssistant({
      case: caseData as CaseInput,
      mode: "multi_turn",
      state,
    });
  };

  const groundTruth = activeSample?.ground_truth;
  const showCompare = Boolean(decision && groundTruth);

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Security Assistant</h1>

      <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[var(--muted)]">Sample case</span>
            <select
              value={activeSample ? SAMPLE_CASES.indexOf(activeSample) : ""}
              onChange={(e) => {
                if (e.target.value !== "") loadSample(Number(e.target.value));
              }}
              className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm"
            >
              <option value="">— select —</option>
              {SAMPLE_CASES.map((s, i) => (
                <option key={s.case_id} value={i}>
                  {(s.title ?? s.case_id) + " · " + s.case_id}
                </option>
              ))}
            </select>
          </label>

          <div className="flex overflow-hidden rounded border border-[var(--border)] text-xs">
            {(["single_turn", "multi_turn"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => changeMode(m)}
                className={`px-3 py-1 ${mode === m ? "bg-[var(--accent)] font-medium text-black" : "text-[var(--muted)]"}`}
              >
                {m === "single_turn" ? "Single-turn" : "Multi-turn"}
              </button>
            ))}
          </div>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-[var(--muted)]">
            Or paste case JSON
          </summary>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder='{"case_id": "...", "journey": "...", "audience": "...", "language": "fi", "signals": { … }}'
            className="mt-2 w-full rounded border border-[var(--border)] bg-[var(--background)] p-2 font-mono text-xs outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={loadPasted}
            disabled={pasted.trim().length === 0 || busy}
            className="mt-2 rounded bg-[var(--accent)] px-3 py-1 text-xs font-medium text-black hover:opacity-90 disabled:opacity-50"
          >
            Load pasted case
          </button>
        </details>
      </section>

      <ChatPanel
        messages={messages}
        busy={busy}
        error={error}
        disabled={!caseData}
        inputDisabled={busy || awaitingConsent || decision !== null}
        onSend={onSend}
        onConsent={onConsent}
      />

      {decision ? <DecisionCard decision={decision} /> : null}

      {showCompare ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <button
            type="button"
            onClick={() => setCompareOpen((open) => !open)}
            className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium"
          >
            <span>Ground-truth comparison</span>
            <span className="text-[var(--muted)]">
              {compareOpen ? "Hide" : "Show"}
            </span>
          </button>
          {compareOpen ? (
            <div className="grid gap-4 border-t border-[var(--border)] p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  Our decision
                </p>
                <p className="mt-1 text-sm">
                  Risk: {decision?.risk_level} · Urgency: {decision?.urgency}
                </p>
                <p className="text-sm">
                  Action: {decision ? actionLabel(decision.primary_action) : "—"}
                </p>
                <ul className="mt-1 list-inside list-disc text-xs text-[var(--muted)]">
                  {decision?.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  Reference
                </p>
                <p className="mt-1 text-sm">
                  Risk: {groundTruth?.risk_level ?? "—"} · Urgency:{" "}
                  {groundTruth?.urgency ?? "—"}
                </p>
                <p className="text-sm">
                  Action:{" "}
                  {groundTruth?.primary_action
                    ? actionLabel(groundTruth.primary_action)
                    : "—"}
                </p>
                <ul className="mt-1 list-inside list-disc text-xs text-[var(--muted)]">
                  {groundTruth?.required_steps?.length
                    ? groundTruth.required_steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))
                    : null}
                </ul>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
