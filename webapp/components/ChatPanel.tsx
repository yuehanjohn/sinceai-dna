"use client";

import { useEffect, useRef, useState } from "react";

export type AssistantMessageKind = "text" | "question" | "consent";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  kind: AssistantMessageKind;
  text: string;
  /** Topics the engine asked about (question turns). */
  topics?: string[];
  /** Consent fields the engine requested (consent_request turns). */
  fields?: string[];
}

interface ChatPanelProps {
  messages: ChatMessage[];
  busy: boolean;
  error: string | null;
  /** True when no case is loaded: the whole panel is inert. */
  disabled: boolean;
  /** True while busy or waiting on an unanswered consent card. */
  inputDisabled: boolean;
  onSend: (text: string) => void;
  onConsent: (fields: string[], granted: boolean) => void;
}

export default function ChatPanel({
  messages,
  busy,
  error,
  disabled,
  inputDisabled,
  onSend,
  onConsent,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [answeredConsent, setAnsweredConsent] = useState<Set<number>>(
    () => new Set(),
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, busy]);

  const submit = () => {
    const text = draft.trim();
    if (!text || disabled || inputDisabled) return;
    setDraft("");
    onSend(text);
  };

  const answerConsent = (id: number, fields: string[], granted: boolean) => {
    if (answeredConsent.has(id)) return;
    setAnsweredConsent((prev) => new Set(prev).add(id));
    onConsent(fields, granted);
  };

  return (
    <section className="flex h-[560px] flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.length === 0 && !busy ? (
          <p className="pt-24 text-center text-sm text-[var(--muted)]">
            Pick a sample case or paste case JSON to start the conversation.
          </p>
        ) : null}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-lg rounded-br-sm bg-[var(--accent)] px-3 py-2 text-sm text-black">
                {m.text}
              </div>
            </div>
          ) : m.kind === "consent" ? (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[85%] space-y-2 rounded-lg rounded-bl-sm border border-[var(--accent)] bg-[var(--background)] px-3 py-2 text-sm">
                <p>{m.text}</p>
                <p className="text-xs text-[var(--muted)]">
                  Requests access to: {m.fields?.join(", ")}
                </p>
                {answeredConsent.has(m.id) ? (
                  <p className="text-xs text-[var(--muted)]">Answered.</p>
                ) : (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => answerConsent(m.id, m.fields ?? [], true)}
                      disabled={busy}
                      className="rounded border border-[var(--success)] px-3 py-1 text-xs font-medium text-[var(--success)] hover:bg-[var(--success)] hover:text-black disabled:opacity-50"
                    >
                      Allow
                    </button>
                    <button
                      type="button"
                      onClick={() => answerConsent(m.id, m.fields ?? [], false)}
                      disabled={busy}
                      className="rounded border border-[var(--error)] px-3 py-1 text-xs font-medium text-[var(--error)] hover:bg-[var(--error)] hover:text-black disabled:opacity-50"
                    >
                      Deny
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[85%] space-y-1">
                <div className="rounded-lg rounded-bl-sm border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm">
                  {m.text}
                </div>
                {m.kind === "question" && m.topics?.length ? (
                  <p className="pl-1 text-xs text-[var(--muted)]">
                    Asked about: {m.topics.join(", ")}
                  </p>
                ) : null}
              </div>
            </div>
          ),
        )}

        {busy ? (
          <div className="flex justify-start">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--muted)]">
              Thinking…
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mx-4 mb-2 rounded border border-[var(--error)] px-3 py-2 text-xs text-[var(--error)]">
          {error}
        </div>
      ) : null}

      <div className="flex gap-2 border-t border-[var(--border)] p-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          disabled={disabled || inputDisabled}
          placeholder={
            disabled
              ? "Load a case first"
              : inputDisabled
                ? "Waiting for the assistant…"
                : "Type your reply…"
          }
          className="flex-1 rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || inputDisabled || draft.trim().length === 0}
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </section>
  );
}
