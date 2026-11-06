"use client";

import { useCallback, useEffect, useState } from "react";
import { DEMO_PARTNERS } from "@/lib/shield/partners";
import type {
  CreditEntry,
  PartnerOutcomeKind,
  PartnerSignalView,
  RemovalNotice,
} from "@/lib/shield/types";

interface PartnerFeed {
  partner: { id: string; name: string; role: string };
  signals: PartnerSignalView[];
  credits: CreditEntry[];
  totalEur: number;
  creditPerVerifiedSignalEur: number;
  notices: RemovalNotice[];
}

interface PostResponse {
  ok?: boolean;
  error?: string;
  suspended?: boolean;
  noticesCount?: number;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

export default function PartnerConsole() {
  const [partnerId, setPartnerId] = useState(DEMO_PARTNERS[0].id);
  const [data, setData] = useState<PartnerFeed | null>(null);
  const [busyReport, setBusyReport] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [openNotice, setOpenNotice] = useState<string | null>(null);

  const load = useCallback(async (pid: string) => {
    setData(null);
    try {
      const res = await fetch(`/api/partners?partnerId=${encodeURIComponent(pid)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Exchange request failed (${res.status})`);
      setData((await res.json()) as PartnerFeed);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Exchange request failed");
    }
  }, []);

  useEffect(() => {
    load(partnerId);
  }, [partnerId, load]);

  const respond = useCallback(
    async (reportId: string, outcome: PartnerOutcomeKind) => {
      setBusyReport(reportId);
      setMessage(null);
      try {
        const res = await fetch("/api/partners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partnerId, reportId, outcome }),
        });
        const body = (await res.json()) as PostResponse;
        if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
        if (outcome === "confirmed") {
          setMessage(`Signal ${reportId} confirmed — rev-share credit booked (+€${data?.creditPerVerifiedSignalEur ?? "…"}).`);
        } else {
          setMessage(
            body.suspended
              ? `Marked legitimate — false-report strike issued, reporter suspended, ${body.noticesCount} removal notice(s) drafted to partners.`
              : "Marked legitimate — false-report strike issued to the reporter and credits for this signal revoked.",
          );
        }
        await load(partnerId);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Request failed");
      } finally {
        setBusyReport(null);
      }
    },
    [partnerId, data, load],
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div>
        <h3 className="font-medium">Partner exchange console (demo)</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Sign in as a partner to consume verified scam signals and earn the rev-share credit.
          Signals are number + network warning + engine classification only — no user details.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DEMO_PARTNERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPartnerId(p.id)}
            className={
              p.id === partnerId
                ? "rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white"
                : "rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            }
          >
            {p.name}
          </button>
        ))}
      </div>

      {message && (
        <p className="rounded-md border border-[var(--accent)] px-3 py-2 text-xs" style={{ color: "var(--accent)" }}>
          {message}
        </p>
      )}

      {data && (
        <>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-md border border-[var(--border)] px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Role</div>
              <div>{data.partner.role}</div>
            </div>
            <div className="rounded-md border border-[var(--border)] px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Rev-share balance</div>
              <div className="font-mono">€{data.totalEur.toFixed(2)}</div>
            </div>
            <div className="rounded-md border border-[var(--border)] px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Per verified signal</div>
              <div className="font-mono">€{data.creditPerVerifiedSignalEur.toFixed(2)}</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-3 py-2 font-medium">Number</th>
                  <th className="px-3 py-2 font-medium">Reported</th>
                  <th className="px-3 py-2 font-medium">Network warning</th>
                  <th className="px-3 py-2 font-medium">Engine</th>
                  <th className="px-3 py-2 font-medium">Partner action</th>
                </tr>
              </thead>
              <tbody>
                {data.signals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-[var(--muted)]">
                      No verified signals in the exchange right now.
                    </td>
                  </tr>
                ) : (
                  data.signals.map((sig) => (
                    <tr key={sig.reportId} className="border-b border-[var(--border)] align-top">
                      <td className="px-3 py-2 font-mono">{sig.number}</td>
                      <td className="px-3 py-2 text-[var(--muted)]">{formatTime(sig.eventAt)}</td>
                      <td className="px-3 py-2">{sig.warningLabel ?? sig.warningCategory ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full border px-2 py-0.5 text-xs" style={{ color: "var(--error)", borderColor: "var(--error)" }}>
                          risk {sig.riskLevel}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {sig.myOutcome ? (
                          <span className="rounded-full border px-2 py-0.5 text-xs" style={sig.myOutcome === "confirmed" ? { color: "var(--success)", borderColor: "var(--success)" } : { color: "var(--warning)", borderColor: "var(--warning)" }}>
                            {sig.myOutcome === "confirmed" ? "confirmed & blocked" : "marked legitimate"}
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              disabled={busyReport === sig.reportId}
                              onClick={() => respond(sig.reportId, "confirmed")}
                              className="rounded-md border border-[var(--success)] px-2 py-1 text-xs text-[var(--success)] transition-colors hover:bg-[color-mix(in_srgb,var(--success)_15%,transparent)] disabled:opacity-50"
                            >
                              {busyReport === sig.reportId ? "Working…" : "Confirm & block (earn credit)"}
                            </button>
                            <button
                              type="button"
                              disabled={busyReport === sig.reportId}
                              onClick={() => respond(sig.reportId, "legitimate")}
                              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
                            >
                              Verify as legitimate
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data.credits.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Rev-share ledger</h4>
              <ul className="mt-2 flex flex-col gap-1 font-mono text-xs">
                {data.credits.map((c) => (
                  <li key={c.id} className="flex justify-between gap-4">
                    <span>
                      {c.at} — {c.number} ({c.basis})
                    </span>
                    <span style={{ color: c.eur >= 0 ? "var(--success)" : "var(--error)" }}>
                      {c.eur >= 0 ? "+" : ""}
                      {c.eur.toFixed(2)} €
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.notices.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--warning)]">
                Removal notices — act on these
              </h4>
              <div className="mt-2 flex flex-col gap-2">
                {data.notices.map((n) => (
                  <div key={n.id} className="rounded-md border px-3 py-2" style={{ borderColor: "var(--warning)" }}>
                    <button
                      type="button"
                      onClick={() => setOpenNotice((cur) => (cur === n.id ? null : n.id))}
                      className="w-full text-left text-sm font-medium"
                    >
                      {n.subject} <span className="text-xs text-[var(--muted)]">({openNotice === n.id ? "hide" : "view"})</span>
                    </button>
                    {openNotice === n.id && (
                      <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed">{n.body}</pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
