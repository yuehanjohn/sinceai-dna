"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { shieldPartners } from "@/lib/shield/partners";
import type { AccountStanding, RemovalNotice } from "@/lib/shield/types";

interface MyReport {
  id: string;
  number: string;
  eventId: string;
  createdAt: string;
  riskLevel: string;
  verified: boolean;
  voidedAt: string | null;
  draftKinds: string[];
}

interface MisuseData {
  standing: AccountStanding;
  strikeLimit: number;
  strikeWindowDays: number;
  reports: MyReport[];
  notices: RemovalNotice[];
}

export default function MisuseConsole() {
  const [data, setData] = useState<MisuseData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [openNotice, setOpenNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/misuse", { cache: "no-store" });
      if (!res.ok) throw new Error(`Moderation request failed (${res.status})`);
      setData((await res.json()) as MisuseData);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Moderation request failed");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const simulateLegitimate = useCallback(
    async (reportId: string) => {
      setBusy(reportId);
      setMessage(null);
      try {
        // Demo: the first partner that has not yet responded to this report
        // verifies it as legitimate. The server enforces one response per
        // partner per report, so this mirrors independent partner verifications.
        let lastError = "No partner available to verify";
        for (const partner of shieldPartners()) {
          const res = await fetch("/api/partners", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ partnerId: partner.id, reportId, outcome: "legitimate" }),
          });
          const body = (await res.json()) as { error?: string; suspended?: boolean; noticesCount?: number };
          if (res.ok) {
            setMessage(
              body.suspended
                ? `${partner.name} verified the number as legitimate — strike limit reached, account suspended and ${body.noticesCount} removal notice(s) drafted to partners.`
                : `${partner.name} verified the number as legitimate — a false-report strike was recorded.`,
            );
            await load();
            return;
          }
          lastError = body.error ?? `Request failed (${res.status})`;
        }
        throw new Error(lastError);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Request failed");
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const reset = useCallback(async () => {
    setBusy("reset");
    setMessage(null);
    try {
      const res = await fetch("/api/misuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (!res.ok) throw new Error(`Reset failed (${res.status})`);
      setMessage("Demo state reset.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(null);
    }
  }, [load]);

  const suspended = Boolean(data?.standing.suspendedAt);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Moderation console (demo)</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            False reports are detected when a partner verifies the number as legitimate. Three
            strikes within {data?.strikeWindowDays ?? 90} days suspend the account, pull every
            report back with removal notices and withdraw your active offer consents.
          </p>
        </div>
        <span
          className="rounded-full border px-3 py-1 text-xs font-semibold uppercase"
          style={suspended ? { color: "var(--error)", borderColor: "var(--error)" } : { color: "var(--success)", borderColor: "var(--success)" }}
        >
          {suspended ? "Suspended" : "Account active"}
        </span>
      </div>

      {message && (
        <p className="rounded-md border border-[var(--accent)] px-3 py-2 text-xs" style={{ color: "var(--accent)" }}>
          {message}
        </p>
      )}

      {data && (
        <>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              False-report strikes ({data.standing.strikes.length}/{data.strikeLimit})
            </h4>
            {data.standing.strikes.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">No strikes.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {data.standing.strikes.map((s) => (
                  <li key={s.id} className="flex justify-between gap-4 rounded-md border px-3 py-1.5" style={{ borderColor: "var(--warning)" }}>
                    <span>{s.number}</span>
                    <span className="text-xs text-[var(--muted)]">{new Date(s.at).toLocaleString("en-GB")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">My reports</h4>
            {data.reports.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">
                No reports yet — report a call from the{" "}
                <Link href="/shield" className="underline">
                  Call Shield
                </Link>{" "}
                log first.
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted)]">
                      <th className="px-3 py-2 font-medium">Number</th>
                      <th className="px-3 py-2 font-medium">Risk</th>
                      <th className="px-3 py-2 font-medium">Drafts</th>
                      <th className="px-3 py-2 font-medium">State</th>
                      <th className="px-3 py-2 font-medium">Demo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reports.map((r) => (
                      <tr key={r.id} className="border-b border-[var(--border)]">
                        <td className="px-3 py-2 font-mono">{r.number}</td>
                        <td className="px-3 py-2">{r.riskLevel}</td>
                        <td className="px-3 py-2 text-[var(--muted)]">{r.draftKinds.join(", ") || "—"}</td>
                        <td className="px-3 py-2">
                          {r.voidedAt ? (
                            <span style={{ color: "var(--error)" }}>withdrawn</span>
                          ) : r.verified ? (
                            <span style={{ color: "var(--success)" }}>verified signal</span>
                          ) : (
                            <span className="text-[var(--muted)]">not verified</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            disabled={busy === r.id}
                            onClick={() => simulateLegitimate(r.id)}
                            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
                            title="Demo: a partner verifies this number as legitimate, which counts as a false report. Several partners may independently verify the same report."
                          >
                            {busy === r.id ? "Working…" : "Simulate: partner says legitimate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {data.notices.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--warning)]">
                Removal notices drafted to partners ({data.notices.length})
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

          <div className="flex justify-end">
            <button
              type="button"
              disabled={busy === "reset"}
              onClick={reset}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
            >
              {busy === "reset" ? "Resetting…" : "Reset demo state"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
