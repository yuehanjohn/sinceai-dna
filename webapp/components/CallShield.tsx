"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_CALL_EVENTS, isHarasserEvent, type CallEvent } from "@/lib/callEvents";
import { caseFromEvent } from "@/lib/shield/caseFromEvent";
import type { Decision, RiskLevel } from "@/lib/engine/types";
import NotificationCenter, { type FeedItem } from "@/components/NotificationCenter";
import { FlameIcon } from "@/components/icons";
import FanoutConsole from "@/components/FanoutConsole";
import {
  notificationPermission,
  requestNotificationPermission,
  showFireBackNotification,
  showScamNotification,
  type PermissionState,
} from "@/lib/shield/notify";
import type { AccountStanding, ReportDraft, ShieldActionId, Submission } from "@/lib/shield/types";
import { summarize } from "@/lib/shield/fanout";
import { fanoutPlan } from "@/lib/shield/channels";

/** fire_back is the headline: one tap, save the number and hand it to the
 * sales economy. The rest is the unglamorous compliance trail. */
const SHIELD_ACTIONS: Array<{ id: ShieldActionId; label: string }> = [
  { id: "fire_back", label: "Fire back — save, block & send to the channels" },
  { id: "block_and_save", label: "Block & save only" },
  { id: "block_device", label: "Block on device only" },
  { id: "report_operator", label: "Report to operator (network filter)" },
  { id: "report_traficom", label: "Report to Traficom" },
  { id: "evidence_pack", label: "Evidence pack for police" },
];

const OUTBOUND: Partial<Record<ShieldActionId, true>> = {
  fire_back: true,
  report_operator: true,
  report_traficom: true,
  evidence_pack: true,
};

/** Demo choreography: calls arrive staggered so detection → notification is observable. */
const ARRIVAL_DELAYS_MS: Record<string, number> = {
  "call-operator-code": 1500,
  "call-wangiri": 6000,
  "call-clinic": 10500,
  "call-harasser": 15000,
};

interface LogRow {
  event: CallEvent;
  outcome: "accepted" | "declined";
  statuses: Partial<Record<ShieldActionId, { status: string; at: string }>>;
  drafts: Partial<Record<ShieldActionId, ReportDraft>>;
  fanout: Submission[];
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
  const [arrived, setArrived] = useState<Record<string, boolean>>({});
  const [ended, setEnded] = useState<Record<string, "accepted" | "declined">>({});
  const [log, setLog] = useState<LogRow[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [standing, setStanding] = useState<AccountStanding | null>(null);
  const autoSavedRef = useRef<Set<string>>(new Set());

  const addToast = useCallback((text: string, tone: Toast["tone"]) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const pushFeed = useCallback((item: FeedItem) => {
    setFeed((prev) => [item, ...prev]);
  }, []);

  const fetchStanding = useCallback(async () => {
    try {
      const res = await fetch("/api/shield", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { standing?: AccountStanding };
      if (data.standing) setStanding(data.standing);
    } catch {
      // demo view only — the log still works locally
    }
  }, []);

  /** FireBack behaviour on detection: notify, feed the centre, auto-save the number. */
  const onCallArrival = useCallback(
    (event: CallEvent) => {
      const label = event.warning?.label ?? "No network warning";
      const harasser = isHarasserEvent(event);
      if (event.severity !== "benign") {
        showScamNotification(event);
        pushFeed({
          id: `${event.id}-detect`,
          title: harasser ? "Repeat caller tagged as harasser" : "Scam call detected",
          body: `${event.number} — ${label}. Number auto-saved; one tap fires it back to the sales channels.`,
          at: new Date().toISOString(),
          tone: "error",
        });
        addToast(
          harasser
            ? "Harasser profile — number auto-saved, one tap sends it everywhere"
            : "Scam suspected — number auto-saved to your blocklist",
          "error",
        );
        if (!autoSavedRef.current.has(event.id)) {
          autoSavedRef.current.add(event.id);
          fetch("/api/shield", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save_number", number: event.number, eventId: event.id, auto: true }),
          })
            .then(async (res) => {
              if (!res.ok) throw new Error(`Auto-save failed (${res.status})`);
              const data = (await res.json()) as { standing?: AccountStanding };
              if (data.standing) setStanding(data.standing);
            })
            .catch((e: unknown) => {
              addToast(e instanceof Error ? e.message : "Auto-save failed", "error");
            });
        }
      } else {
        pushFeed({
          id: `${event.id}-detect`,
          title: "Spam-flagged call",
          body: `${event.number} — ${label}. Looks benign — ask the assistant before firing back.`,
          at: new Date().toISOString(),
          tone: "warning",
        });
        addToast("Flagged as spam, looks benign — ask the assistant", "warning");
      }
    },
    [addToast, pushFeed],
  );

  // Simulated incoming calls: staggered arrivals, cleaned up on unmount.
  useEffect(() => {
    setPermission(notificationPermission());
    fetchStanding();
    const timers = DEMO_CALL_EVENTS.map((event) =>
      setTimeout(() => {
        setArrived((prev) => ({ ...prev, [event.id]: true }));
        onCallArrival(event);
      }, ARRIVAL_DELAYS_MS[event.id] ?? 3000),
    );
    return () => timers.forEach(clearTimeout);
  }, [fetchStanding, onCallArrival]);

  const endCall = useCallback(
    (event: CallEvent, outcome: "accepted" | "declined") => {
      setEnded((prev) => ({ ...prev, [event.id]: outcome }));
      setLog((prev) => [
        { event, outcome, statuses: {}, drafts: {}, fanout: [], decision: null, adviceLoading: false, adviceError: null },
        ...prev,
      ]);
      addToast(
        outcome === "accepted" ? "Answered — evidence saved to FireBack log" : "Declined — evidence saved to FireBack log",
        outcome === "accepted" ? "warning" : "success",
      );
    },
    [addToast],
  );

  /** Server-side promotion of scheduled deliveries: poll while anything is queued. */
  const refreshSubmissions = useCallback(async () => {
    try {
      const res = await fetch("/api/shield", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { submissions?: Submission[] };
      if (!data.submissions) return;
      const byEvent = new Map<string, Submission[]>();
      for (const sub of data.submissions) {
        byEvent.set(sub.eventId, [...(byEvent.get(sub.eventId) ?? []), sub]);
      }
      setLog((prev) =>
        prev.map((row) => {
          const mine = byEvent.get(row.event.id);
          return mine ? { ...row, fanout: mine } : row;
        }),
      );
    } catch {
      // demo view only
    }
  }, []);

  const runAction = useCallback(
    async (eventId: string, action: ShieldActionId, eventArg?: CallEvent) => {
      const event = eventArg ?? log.find((r) => r.event.id === eventId)?.event;
      if (!event) return;
      const existing = log.find((r) => r.event.id === eventId);
      if (existing?.statuses[action]) return;
      try {
        const res = await fetch("/api/shield", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, number: event.number, eventId }),
        });
        if (res.status === 403) {
          const data = (await res.json().catch(() => null)) as { error?: string; standing?: AccountStanding } | null;
          if (data?.standing) setStanding(data.standing);
          addToast(data?.error ?? "Account suspended — outbound reporting is disabled", "error");
          return;
        }
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as {
          entry: { status: string; at: string };
          draft?: ReportDraft;
          submissions?: Submission[];
          standing?: AccountStanding;
        };
        if (data.standing) setStanding(data.standing);
        const status = { status: data.entry.status, at: data.entry.at };
        setLog((prev) => {
          let found = false;
          const next = prev.map((r) => {
            if (r.event.id !== eventId) return r;
            found = true;
            return {
              ...r,
              statuses: { ...r.statuses, [action]: status },
              drafts: data.draft ? { ...r.drafts, [action]: data.draft } : r.drafts,
              fanout: data.submissions ?? r.fanout,
            };
          });
          // Firing back straight from an incoming call card: the row may not
          // exist yet (endCall's prepend is still in flight).
          return found
            ? next
            : [
                {
                  event,
                  outcome: "declined" as const,
                  statuses: { [action]: status },
                  drafts: data.draft ? { [action]: data.draft } : {},
                  fanout: data.submissions ?? [],
                  decision: null,
                  adviceLoading: false,
                  adviceError: null,
                },
                ...next,
              ];
        });
        if (data.submissions) {
          const counts = summarize(data.submissions).byKind;
          showFireBackNotification(event.number, data.submissions.length);
          pushFeed({
            id: `${eventId}-fireback`,
            title: "Fired back",
            body: `${event.number} posted to ${data.submissions.length} channels — ${counts.real_estate ?? 0} estate agents, ${counts.sales ?? 0} sales companies${isHarasserEvent(event) ? ", plus the harasser extra" : ""}.`,
            at: new Date().toISOString(),
            tone: "success",
          });
          addToast(`Fired back — ${data.submissions.length} forms sent on the caller's behalf`, "success");
        } else {
          addToast(`Logged: ${SHIELD_ACTIONS.find((a) => a.id === action)?.label ?? action}`, "success");
        }
      } catch (e) {
        addToast(e instanceof Error ? e.message : "Action failed", "error");
      }
    },
    [log, addToast, pushFeed],
  );

  // Poll only while a fan-out is still landing — the server does the promoting.
  useEffect(() => {
    if (!log.some((row) => row.fanout.some((sub) => sub.status === "queued"))) return;
    const timer = setInterval(refreshSubmissions, 700);
    return () => clearInterval(timer);
  }, [log, refreshSubmissions]);

  const askAssistant = useCallback(
    async (eventId: string) => {
      const row = log.find((r) => r.event.id === eventId);
      if (!row || row.adviceLoading) return;
      const e = row.event;
      setLog((prev) =>
        prev.map((r) => (r.event.id === eventId ? { ...r, adviceLoading: true, adviceError: null } : r)),
      );
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ case: caseFromEvent(e), mode: "single_turn" }),
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = (await res.json()) as { decision?: Decision };
        if (!data.decision) throw new Error("No decision returned");
        setLog((prev) =>
          prev.map((r) => (r.event.id === eventId ? { ...r, decision: data.decision!, adviceLoading: false } : r)),
        );
      } catch (err) {
        setLog((prev) =>
          prev.map((r) =>
            r.event.id === eventId
              ? { ...r, adviceLoading: false, adviceError: err instanceof Error ? err.message : "Assistant request failed" }
              : r,
          ),
        );
      }
    },
    [log],
  );

  const enableNotifications = useCallback(async () => {
    const p = await requestNotificationPermission();
    setPermission(p);
    if (p === "granted") addToast("Notifications enabled — scam detections will pop up", "success");
    if (p === "denied") addToast("Notifications blocked in the browser — the feed below still works", "warning");
  }, [addToast]);

  useEffect(() => {
    return () => {
      setToasts([]);
    };
  }, []);

  const suspended = Boolean(standing?.suspendedAt);
  const incoming = DEMO_CALL_EVENTS.filter((e) => arrived[e.id] && !ended[e.id]);
  const waitingForCalls = DEMO_CALL_EVENTS.some((e) => !arrived[e.id]);

  return (
    <div className="flex flex-col gap-6">
      {/* Product banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-4 py-3 text-sm">
        <span className="text-[var(--muted)]">
          The assistant advises. FireBack acts: one tap fires the caller&#39;s number into the
          Finnish sales economy — estate agents, sales companies, a public listing, and for
          harassers the dating sites too.
        </span>
        <Link
          href="/misuse"
          className="shrink-0 rounded-md border border-[var(--accent)] px-3 py-1 text-[var(--accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_15%,transparent)]"
        >
          Read the misuse policy
        </Link>
      </div>

      {/* Suspension banner */}
      {suspended && (
        <div className="rounded-lg border border-[var(--error)] bg-[color-mix(in_srgb,var(--error)_10%,transparent)] px-4 py-3 text-sm" style={{ color: "var(--error)" }}>
          Account suspended for misuse — outbound reporting and firing back are disabled. Removal
          notices are drafted to every partner holding your numbers, and your offer consents are
          withdrawn.{" "}
          <Link href="/misuse" className="underline">Details</Link>
        </div>
      )}

      <NotificationCenter
        items={feed}
        permission={permission}
        onEnable={enableNotifications}
        onClear={() => setFeed([])}
      />

      {/* Incoming calls */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Incoming calls</h2>
        {incoming.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            {waitingForCalls ? "Waiting for calls…" : "No incoming calls — all demo calls handled."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {incoming.map((event) => {
              const tone = warningTone(event.warning?.category);
              const harasser = isHarasserEvent(event);
              const targets = fanoutPlan(harasser).length;
              return (
                <div
                  key={event.id}
                  className={
                    harasser
                      ? "flex flex-col gap-3 rounded-lg border border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-4"
                      : "flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-[var(--muted)]">Incoming call</span>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                    </span>
                  </div>
                  <div className="font-mono text-lg text-[var(--foreground)]">{event.number}</div>
                  <div className="flex flex-wrap gap-1.5">
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
                    {harasser && (
                      <span
                        className="flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
                        style={toneVars("warning")}
                        title="Tagged as a nuisance caller: the extra dating-site group goes out with the same fire-back tap."
                      >
                        <FlameIcon className="h-3.5 w-3.5" />
                        harasser profile
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted)]">{event.notes}</p>
                  {harasser && (
                    <p className="text-xs font-medium" style={{ color: "var(--warning)" }}>
                      Harasser extra: this fire-back also lands on the dating sites.
                    </p>
                  )}
                  {event.severity !== "benign" && (
                    <button
                      type="button"
                      onClick={() => {
                        endCall(event, "declined");
                        void runAction(event.id, "fire_back", event);
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      style={
                        harasser
                          ? { boxShadow: "0 0 0 2px color-mix(in srgb, var(--warning) 50%, transparent)" }
                          : undefined
                      }
                    >
                      <FlameIcon className="h-4 w-4" />
                      <span>
                        Fire back — save, block &amp; send to {targets} channels
                        {harasser ? " (incl. the harasser extra — dating sites)" : ""}
                      </span>
                    </button>
                  )}
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

      {/* FireBack log */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">FireBack log</h2>
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
                      statusChips={statusChips}
                      outboundDisabled={suspended}
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
  statusChips,
  outboundDisabled,
  onAction,
  onAsk,
}: {
  row: LogRow;
  statusChips: Array<{ id: ShieldActionId; label: string }>;
  outboundDisabled: boolean;
  onAction: (eventId: string, action: ShieldActionId) => void;
  onAsk: (eventId: string) => void;
}) {
  const [openDraft, setOpenDraft] = useState<ShieldActionId | null>(null);
  const [copied, setCopied] = useState(false);
  const tone = warningTone(row.event.warning?.category);
  const drafts = SHIELD_ACTIONS.filter((a) => row.drafts[a.id]);
  const harasser = isHarasserEvent(row.event);

  const copyDraft = useCallback(() => {
    if (!openDraft) return;
    const d = row.drafts[openDraft];
    if (!d) return;
    navigator.clipboard
      .writeText(`${d.subject}\n\n${d.body}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  }, [openDraft, row.drafts]);

  return (
    <>
      <tr className="border-b border-[var(--border)] align-top">
        <td className="px-4 py-3 font-mono">{row.event.number}</td>
        <td className="px-4 py-3 text-[var(--muted)]">{formatTime(row.event.at)}</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {row.event.warning ? (
              <span className="rounded-full border px-2 py-0.5 text-xs" style={toneVars(tone)}>
                {row.event.warning.category}
              </span>
            ) : (
              <span className="text-xs text-[var(--muted)]">none</span>
            )}
            {harasser && (
              <span
                className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
                style={toneVars("warning")}
                title="Nuisance caller — the extra dating-site group goes out with the fire-back."
              >
                <FlameIcon className="h-3.5 w-3.5" />
                harasser profile
              </span>
            )}
          </div>
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
              const blockedBySuspension = Boolean(OUTBOUND[a.id]) && outboundDisabled;
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={done || blockedBySuspension}
                  onClick={() => onAction(row.event.id, a.id)}
                  title={blockedBySuspension ? "Disabled while the account is suspended" : undefined}
                  className={
                    done
                      ? "cursor-not-allowed rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]"
                      : a.id === "fire_back"
                        ? "inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
                        : "rounded-md border border-[var(--accent)] px-2 py-1 text-xs text-[var(--accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_15%,transparent)]"
                  }
                >
                  {done ? "✓ " : ""}
                  {a.id === "fire_back" && <FlameIcon className="h-3.5 w-3.5" />}
                  {a.id === "fire_back"
                    ? `Fire back to ${fanoutPlan(harasser).length} channels`
                    : a.label}
                </button>
              );
            })}
            {drafts.map((a) => (
              <button
                key={`draft-${a.id}`}
                type="button"
                onClick={() => setOpenDraft((cur) => (cur === a.id ? null : a.id))}
                className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              >
                {openDraft === a.id ? "Hide" : "View"} draft: {a.label}
              </button>
            ))}
            <button
              type="button"
              disabled={row.adviceLoading}
              onClick={() => onAsk(row.event.id)}
              className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {row.adviceLoading ? "Asking…" : row.decision ? "Advice shown" : "Ask the assistant"}
            </button>
          </div>
        </td>
      </tr>
      {row.fanout.length > 0 && (
        <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_60%,transparent)]">
          <td colSpan={5} className="px-4 py-3">
            <FanoutConsole number={row.event.number} submissions={row.fanout} />
          </td>
        </tr>
      )}
      {openDraft && row.drafts[openDraft] && (
        <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_60%,transparent)]">
          <td colSpan={5} className="px-4 py-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{row.drafts[openDraft]!.subject}</span>
                <button
                  type="button"
                  onClick={copyDraft}
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                >
                  {copied ? "Copied ✓" : "Copy draft"}
                </button>
              </div>
              <pre className="whitespace-pre-wrap rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-relaxed">
                {row.drafts[openDraft]!.body}
              </pre>
              <p className="text-xs text-[var(--muted)]">
                Nothing is sent automatically — you review and send this draft yourself.
              </p>
            </div>
          </td>
        </tr>
      )}
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
