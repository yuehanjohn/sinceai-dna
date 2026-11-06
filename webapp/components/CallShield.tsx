"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DEMO_CALL_EVENTS, type CallEvent } from "@/lib/callEvents";
import type { CaseInput, Decision, RiskLevel } from "@/lib/engine/types";

type ShieldActionId = "block_device" | "report_operator" | "report_traficom" | "evidence_pack";

const SHIELD_ACTIONS: Array<{ id: ShieldActionId; label: string }> = [
  { id: "block_device", label: "Block on device" },
  { id: "report_operator", label: "Report to operator (network filter)" },
  { id: "report_traficom", label: "Report to Traficom" },
  { id: "evidence_pack", label: "Evidence pack for police" },
];

interface LogRow {
  event: CallEvent;
  outcome: "accepted" | "declined";
  statuses: Partial<Record<ShieldActionId, { status: string; at: string }>>;
  decision: Decision | null;
  adviceLoading: boolean;
  adviceError: string | null;
}

interface Toast {
  id: number;
  text: string;
  tone: "success" | "warning" | "error";
}

function riskTone(level: RiskLevel | string): "success" | "warning" | "error" {
  if (level === "medium") return "warning";
  if (level === "high" || level === "critical") return "error";
  return "success";
}

function toneVars(tone: string): React.CSSProperties {
  const c = `var(--${tone})`;
  return {
    color: c,
    borderColor: c,
    backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)`,
  };
}

function warningTone(category: string | undefined): "success" | "warning" | "error" {
  if (category === "scam_suspected") return "error";
  if (category === "spam" || category === "premium") return "warning";
  return "success";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function CallShield() {
  const [ended, setEnded] = useState<Record<string, "accepted" | "declined">>({});
  const [log, setLog] = useState<LogRow[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((text: string, tone: Toast["tone"]) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const endCall = useCallback(
    (event: CallEvent, outcome: "accepted" | "declined") => {
      setEnded((prev) => ({ ...prev, [event.id]: outcome }));
      setLog((prev) => [
        { event, outcome, statuses: {}, decision: null, adviceLoading: false, adviceError: null },
        ...prev,
      ]);
      if (event.severity === "scam") {
        addToast("Scam suspected — caller auto-saved to Shield log", "error");
      } else {
        addToast("Flagged as spam, looks benign — ask the assistant", "warning");
      }
    },
    [addToast],
  );

  const runAction = useCallback(
    async (rowIndex: number, action: ShieldActionId) => {
      const row = log[rowIndex];
      if (!row || row.statuses[action]) return;
      try {
        const res = await fetch("/api/shield", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, number: row.event.number, eventId: row.event.id }),
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const entry = (await res.json()) as { status: string; at: string };
        setLog((prev) =>
          prev.map((r, i) =>
            i === rowIndex ? { ...r, statuses: { ...r.statuses, [action]: { status: entry.status, at: entry.at } } } : r,
          ),
        );
        addToast(`Logged: ${SHIELD_ACTIONS.find((a) => a.id === action)?.label ?? action}`, "success");
      } catch (e) {
        addToast(e instanceof Error ? e.message : "Action failed", "error");
      }
    },
    [log, addToast],
  );

  const askAssistant = useCallback(
    async (rowIndex: number) => {
      const row = log[rowIndex];
      if (!row || row.adviceLoading) return;
      setLog((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, adviceLoading: true, adviceError: null } : r)));
      const e = row.event;
      const caseInput: CaseInput = {
        case_id: `shield-${e.id}`,
        journey: "suspicious_call",
        audience: "consumer",
        language: e.language,
        opening_message: e.notes,
        signals: {
          artifact: { type: "call", sender: e.number, body: e.notes },
          call_warning: e.warning ? { category: e.warning.category, label: e.warning.label } : null,
        },
        consent: { requires_consent: [], pre_granted: [] },
      };
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ case: caseInput, mode: "single_turn" }),
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as { decision?: Decision };
        if (!data.decision) throw new Error("No decision returned");
        setLog((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, decision: data.decision!, adviceLoading: false } : r)));
      } catch (err) {
        setLog((prev) =>
          prev.map((r, i) =>
            i === rowIndex
              ? { ...r, adviceLoading: false, adviceError: err instanceof Error ? err.message : "Assistant request failed" }
              : r,
          ),
        );
      }
    },
    [log],
  );

  useEffect(() => {
    return () => {
      setToasts([]);
    };
  }, []);

  const incoming = DEMO_CALL_EVENTS.filter((e) => !ended[e.id]);

  return (
    <div className="flex flex-col gap-6">
      {/* Misuse banner */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
        <span className="text-[var(--muted)]">
          We help you block, report and escalate. We never retaliate against callers.
        </span>
        <Link
          href="/misuse"
          className="shrink-0 rounded-md border border-[var(--accent)] px-3 py-1 text-[var(--accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_15%,transparent)]"
        >
          Read our misuse policy
        </Link>
      </div>

      {/* Incoming calls */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Incoming calls</h2>
        {incoming.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No incoming calls — all demo calls handled.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {incoming.map((event) => {
              const tone = warningTone(event.warning?.category);
              return (
                <div
                  key={event.id}
                  className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-[var(--muted)]">Incoming call</span>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                    </span>
                  </div>
                  <div className="font-mono text-lg text-[var(--foreground)]">{event.number}</div>
                  {event.warning ? (
                    <span
                      className="w-fit rounded-full border px-2 py-0.5 text-xs font-medium"
                      style={toneVars(tone)}
                    >
                      {event.warning.label}
                    </span>
                  ) : (
                    <span className="w-fit rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">
                      No warning
                    </span>
                  )}
                  <p className="text-xs text-[var(--muted)]">{event.notes}</p>
                  <div className="mt-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => endCall(event, "accepted")}
                      className="flex-1 rounded-md border border-[var(--success)] px-3 py-1.5 text-sm font-medium text-[var(--success)] transition-colors hover:bg-[color-mix(in_srgb,var(--success)_15%,transparent)]"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => endCall(event, "declined")}
                      className="flex-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[color-mix(in_srgb,var(--muted)_15%,transparent)]"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Shield log */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Shield log</h2>
        {log.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No calls in the log yet — accept or decline an incoming call above.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-2 font-medium">Number</th>
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">Warning</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {log.map((row, i) => {
                  const statusChips = SHIELD_ACTIONS.filter((a) => row.statuses[a.id]);
                  return (
                    <LogRowGroup
                      key={`${row.event.id}-${i}`}
                      row={row}
                      rowIndex={i}
                      statusChips={statusChips}
                      onAction={runAction}
                      onAsk={askAssistant}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-lg border bg-[var(--surface)] px-4 py-3 text-sm shadow-lg"
            style={toneVars(t.tone)}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function LogRowGroup({
  row,
  rowIndex,
  statusChips,
  onAction,
  onAsk,
}: {
  row: LogRow;
  rowIndex: number;
  statusChips: Array<{ id: ShieldActionId; label: string }>;
  onAction: (rowIndex: number, action: ShieldActionId) => void;
  onAsk: (rowIndex: number) => void;
}) {
  const tone = warningTone(row.event.warning?.category);
  return (
    <>
      <tr className="border-b border-[var(--border)] align-top">
        <td className="px-4 py-3 font-mono">{row.event.number}</td>
        <td className="px-4 py-3 text-[var(--muted)]">{formatTime(row.event.at)}</td>
        <td className="px-4 py-3">
          {row.event.warning ? (
            <span className="rounded-full border px-2 py-0.5 text-xs" style={toneVars(tone)}>
              {row.event.warning.category}
            </span>
          ) : (
            <span className="text-xs text-[var(--muted)]">none</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">
              {row.outcome === "accepted" ? "Answered" : "Declined"}
            </span>
            {statusChips.map((a) => (
              <span
                key={a.id}
                className="rounded-full border px-2 py-0.5 text-xs"
                style={toneVars("success")}
                title={`${a.label} — ${row.statuses[a.id]!.at}`}
              >
                {a.label}: {row.statuses[a.id]!.status}
              </span>
            ))}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex max-w-xs flex-wrap gap-1.5">
            {SHIELD_ACTIONS.map((a) => {
              const done = Boolean(row.statuses[a.id]);
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={done}
                  onClick={() => onAction(rowIndex, a.id)}
                  className={
                    done
                      ? "cursor-not-allowed rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]"
                      : "rounded-md border border-[var(--accent)] px-2 py-1 text-xs text-[var(--accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_15%,transparent)]"
                  }
                >
                  {done ? "✓ " : ""}
                  {a.label}
                </button>
              );
            })}
            <button
              type="button"
              disabled={row.adviceLoading}
              onClick={() => onAsk(rowIndex)}
              className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {row.adviceLoading ? "Asking…" : row.decision ? "Advice shown" : "Ask the assistant"}
            </button>
          </div>
        </td>
      </tr>
      {(row.decision || row.adviceError) && (
        <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_60%,transparent)]">
          <td colSpan={5} className="px-4 py-3">
            {row.adviceError ? (
              <p className="text-sm" style={{ color: "var(--error)" }}>
                Assistant error: {row.adviceError}
              </p>
            ) : row.decision ? (
              <CompactAdvice decision={row.decision} />
            ) : null}
          </td>
        </tr>
      )}
    </>
  );
}

function CompactAdvice({ decision }: { decision: Decision }) {
  const tone = riskTone(decision.risk_level);
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border px-2 py-0.5 text-xs font-medium uppercase" style={toneVars(tone)}>
          Risk: {decision.risk_level}
        </span>
        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">
          Urgency: {decision.urgency}
        </span>
        {decision.escalation_required && (
          <span className="rounded-full border px-2 py-0.5 text-xs font-medium" style={toneVars("error")}>
            Escalate → {decision.escalation_target?.replace(/_/g, " ") ?? "human"}
          </span>
        )}
      </div>
      <p className="leading-relaxed">{decision.advice_text}</p>
      {decision.steps.length > 0 && (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[var(--muted)]">
          {decision.steps.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
        </ul>
      )}
      {typeof decision.confidence === "number" && (
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <span>Confidence</span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full border border-[var(--border)]">
            <div
              className="h-full bg-[var(--accent)]"
              style={{ width: `${Math.round(decision.confidence * 100)}%` }}
            />
          </div>
          <span>{Math.round(decision.confidence * 100)}%</span>
        </div>
      )}
    </div>
  );
}
