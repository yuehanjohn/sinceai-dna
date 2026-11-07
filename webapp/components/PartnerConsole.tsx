"use client";

import { useCallback, useEffect, useState } from "react";
import { DEMO_PARTNERS, partnerById } from "@/lib/shield/partners";
import type {
  CreditEntry,
  PartnerOutcomeKind,
  PartnerSignalView,
  RemovalNotice,
} from "@/lib/shield/types";

interface PartnerFeed {
  partner: { id: string; name: string; role: string; kind: string };
  leadCommissionOwedEur?: number;
  weakLeadShareEur: number;
  weakLeads: {
    submissionId: string;
    number: string;
    sharedAt: string;
    deliverAt: string;
    status: string;
    payload: Record<string, string>;
  }[];
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

interface FeedDelta {
  partner: { id: string; name: string; role: string; kind: string };
  generatedAt: string;
  cursor: string;
  signals: {
    reportId: string;
    number: string;
    eventAt: string | null;
    warningLabel: string | null;
    warningCategory: string | null;
    riskLevel: string;
    confirmedByPartner: boolean;
  }[];
  retracted: { reportId: string; number: string; at: string }[];
  notices: RemovalNotice[];
  leads: { grantId: string; number: string; consentedAt: string; commissionEur: number }[];
  leadRevocations: { grantId: string; number: string; at: string }[];
  weakLeads: { submissionId: string; number: string; deliveredAt: string; payload: Record<string, string> }[];
  weakLeadPurges: { submissionId: string; number: string; at: string }[];
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
  const [feed, setFeed] = useState<FeedDelta | null>(null);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [busyFeed, setBusyFeed] = useState(false);
  const [keyOverride, setKeyOverride] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState(false);
  const effectiveKey = keyOverride ?? partnerById(partnerId)?.apiKey ?? "";

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

  const fetchFeed = useCallback(
    async (useCursor: boolean) => {
      setBusyFeed(true);
      setMessage(null);
      try {
        const key = effectiveKey;
        const since = useCursor && feedCursor ? `?since=${encodeURIComponent(feedCursor)}` : "";
        const res = await fetch(`/api/partners/feed${since}`, {
          cache: "no-store",
          headers: { "X-Partner-Key": key },
        });
        const body = (await res.json()) as FeedDelta & { error?: string };
        if (!res.ok) throw new Error(body.error ?? `Feed request failed (${res.status})`);
        setFeed(body);
        setFeedCursor(body.cursor);
        setMessage(
          `Feed synced — signals ${body.signals.length} · retracted ${body.retracted.length} · notices ${body.notices.length} · weak leads ${body.weakLeads.length} · weak-lead purges ${body.weakLeadPurges.length} · leads ${body.leads.length} · lead revocations ${body.leadRevocations.length}.`,
        );
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Feed request failed");
      } finally {
        setBusyFeed(false);
      }
    },
    [partnerId, feedCursor, effectiveKey],
  );

  const rotateKey = useCallback(async () => {
    setBusyKey(true);
    setMessage(null);
    try {
      const res = await fetch("/api/partners/feed/rotate", {
        method: "POST",
        headers: { "X-Partner-Key": effectiveKey },
      });
      const body = (await res.json()) as { apiKey?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? `Rotation failed (${res.status})`);
      setKeyOverride(body.apiKey ?? null);
      setFeed(null);
      setFeedCursor(null);
      setMessage(
        `API key rotated for ${partnerById(partnerId)?.name ?? "partner"} — the previous key no longer works. Copy the new key now; it is shown until you switch partners.`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Rotation failed");
    } finally {
      setBusyKey(false);
    }
  }, [effectiveKey, partnerId]);

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
          Sign in as a partner to see what it receives: verified signals (blocklist), weak leads
          (sales), consented leads (marketplace). Every euro comes from the subscription fund, never
          the user.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DEMO_PARTNERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setPartnerId(p.id);
              setFeed(null);
              setFeedCursor(null);
              setKeyOverride(null);
            }}
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

      <div className="rounded-lg border border-[var(--border)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Sync feed (API)</h4>
            <p className="mt-1 max-w-xl text-xs text-[var(--muted)]">
              Poll <span className="font-mono">/api/partners/feed</span> with this partner&#39;s key.
              Cursor deltas: signals or leads, plus retractions, revocations and purge notices.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busyFeed}
              onClick={() => fetchFeed(false)}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
            >
              {busyFeed ? "Working…" : "Fetch full feed"}
            </button>
            <button
              type="button"
              disabled={busyFeed || !feedCursor}
              onClick={() => fetchFeed(true)}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
            >
              Fetch since last
            </button>
            <button
              type="button"
              disabled={busyKey || busyFeed}
              onClick={rotateKey}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
            >
              {busyKey ? "Rotating…" : "Rotate key"}
            </button>
          </div>
        </div>
        <p className="mt-2 break-all font-mono text-xs text-[var(--muted)]">
          X-Partner-Key: {effectiveKey || "—"}
        </p>
        {feed && (
          <div className="mt-3 flex flex-col gap-1 font-mono text-xs">
            <div className="text-[var(--muted)]">cursor {feed.cursor}</div>
            {feed.signals.map((sig) => (
              <div key={sig.reportId}>
                signal · {sig.number} · risk {sig.riskLevel} · {sig.warningLabel ?? sig.warningCategory ?? "—"}
                {sig.confirmedByPartner ? " · confirmed" : ""}
              </div>
            ))}
            {feed.retracted.map((rt) => (
              <div key={rt.reportId} style={{ color: "var(--warning)" }}>
                retract · {rt.number} · purge since {formatTime(rt.at)}
              </div>
            ))}
            {feed.weakLeads.map((w) => (
              <div key={w.submissionId}>
                weak lead · {w.number} · delivered {formatTime(w.deliveredAt)} · form {Object.keys(w.payload).length} fields
              </div>
            ))}
            {feed.weakLeadPurges.map((w) => (
              <div key={w.submissionId} style={{ color: "var(--warning)" }}>
                weak lead purged · {w.number} · since {formatTime(w.at)}
              </div>
            ))}
            {feed.leads.map((l) => (
              <div key={l.grantId}>
                lead · {l.number} · consented {formatTime(l.consentedAt)} · commission €{l.commissionEur.toFixed(2)}
              </div>
            ))}
            {feed.leadRevocations.map((rv) => (
              <div key={rv.grantId} style={{ color: "var(--warning)" }}>
                lead revoked · {rv.number} · purge since {formatTime(rv.at)}
              </div>
            ))}
            {feed.notices.map((n) => (
              <div key={n.id} style={{ color: "var(--warning)" }}>
                notice · {n.subject}
              </div>
            ))}
          </div>
        )}
      </div>

      {data && (
        <>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-md border border-[var(--border)] px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Role</div>
              <div>{data.partner.role}</div>
            </div>
            {data.partner.kind !== "marketplace" && (
              <>
                <div className="rounded-md border border-[var(--border)] px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Rev-share balance</div>
                  <div className="font-mono">€{data.totalEur.toFixed(2)}</div>
                </div>
                <div className="rounded-md border border-[var(--border)] px-3 py-2">
                  <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
                    {data.partner.kind === "weak_lead" ? "Per weak lead" : "Per verified signal"}
                  </div>
                  <div className="font-mono">
                    €
                    {(data.partner.kind === "weak_lead"
                      ? data.weakLeadShareEur
                      : data.creditPerVerifiedSignalEur
                    ).toFixed(2)}
                  </div>
                </div>
                {data.partner.kind === "weak_lead" && (
                  <div className="rounded-md border border-[var(--border)] px-3 py-2">
                    <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Weak leads held</div>
                    <div className="font-mono">{data.weakLeads.length}</div>
                  </div>
                )}
              </>
            )}
            {data.partner.kind === "marketplace" && (
              <div className="rounded-md border border-[var(--border)] px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Lead commission owed</div>
                <div className="font-mono">€{(data.leadCommissionOwedEur ?? 0).toFixed(2)}</div>
              </div>
            )}
          </div>

          {data.partner.kind === "shield" && (
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
          </div>)}

          {data.partner.kind === "weak_lead" && (
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] text-xs uppercase tracking-wide text-[var(--muted)]">
                    <th className="px-3 py-2 font-medium">Number to call</th>
                    <th className="px-3 py-2 font-medium">Shared</th>
                    <th className="px-3 py-2 font-medium">State</th>
                    <th className="px-3 py-2 font-medium">Form as filled</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weakLeads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-[var(--muted)]">
                        No weak leads yet — fire a call back from the{" "}
                        <a className="underline" href="/shield">
                          FireBack
                        </a>
                        .
                      </td>
                    </tr>
                  ) : (
                    data.weakLeads.map((w) => (
                      <tr key={w.submissionId} className="border-b border-[var(--border)] align-top">
                        <td className="px-3 py-2 font-mono">{w.number}</td>
                        <td className="px-3 py-2 text-[var(--muted)]">{formatTime(w.sharedAt)}</td>
                        <td className="px-3 py-2">
                          <span
                            className="rounded-full border px-2 py-0.5 text-xs"
                            style={
                              w.status === "purged"
                                ? { color: "var(--error)", borderColor: "var(--error)" }
                                : w.status === "delivered"
                                  ? { color: "var(--success)", borderColor: "var(--success)" }
                                  : { color: "var(--warning)", borderColor: "var(--warning)" }
                            }
                          >
                            {w.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <ul className="flex flex-col gap-0.5 font-mono text-xs">
                            {Object.entries(w.payload).map(([k, val]) => (
                              <li key={k}>
                                <span className="text-[var(--muted)]">{k}: </span>
                                {val}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {data.partner.kind !== "marketplace" && data.credits.length > 0 && (
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
