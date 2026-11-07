"use client";

import { useCallback, useEffect, useState } from "react";

interface LeadPartner {
  id: string;
  name: string;
  role: string;
}

interface LeadConsentView {
  id: string;
  at: string;
  partnerId: string;
  number: string;
  language: string;
  withdrawnAt: string | null;
}

interface LeadGrantView {
  id: string;
  at: string;
  consentId: string;
  partnerId: string;
  number: string;
  userRewardEur: number;
  commissionEur: number;
  rewardRevokedAt: string | null;
}

interface LeadsData {
  partners: LeadPartner[];
  rewardPerLeadEur: number;
  commissionPerLeadEur: number;
  consents: LeadConsentView[];
  grants: LeadGrantView[];
  rewardTotalEur: number;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

export default function LeadMarketplace() {
  const [data, setData] = useState<LeadsData | null>(null);
  const [partnerId, setPartnerId] = useState<string>("");
  const [number, setNumber] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/leads", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const body = (await res.json()) as LeadsData;
      setData(body);
      setPartnerId((cur) => cur || body.partners[0]?.id || "");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const consent = useCallback(async () => {
    setBusy("consent");
    setMessage(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "consent", partnerId, number }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      setMessage(`Consent recorded — the lead is with ${data?.partners.find((p) => p.id === partnerId)?.name ?? "the partner"} and your reward is booked.`);
      setNumber("");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }, [partnerId, number, data, load]);

  const revoke = useCallback(
    async (consentId: string) => {
      setBusy(consentId);
      setMessage(null);
      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "revoke", consentId }),
        });
        const body = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
        setMessage("Consent withdrawn — the lead is voided and a purge notice was drafted to the partner.");
        await load();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Request failed");
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div>
        <h3 className="font-medium">Verified offers — share your number, your choice</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Pick a partner, share your own number once, and earn service credit. Withdraw anytime:
          the lead is voided and the partner receives a formal purge notice (GDPR Art. 7(3),
          17(1)(b), 19). Numbers you report as scams never enter this marketplace.
        </p>
      </div>

      {data && (
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="rounded-md border border-[var(--border)] px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Reward per lead</div>
            <div className="font-mono">€{data.rewardPerLeadEur.toFixed(2)} credit</div>
          </div>
          <div className="rounded-md border border-[var(--border)] px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Your earned credits</div>
            <div className="font-mono">€{data.rewardTotalEur.toFixed(2)}</div>
          </div>
          <div className="rounded-md border border-[var(--border)] px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Partner commission</div>
            <div className="font-mono">€{data.commissionPerLeadEur.toFixed(2)} / lead</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(data?.partners ?? []).map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.role}
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

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Your own number, e.g. +358 40 123 4567"
          className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <button
          type="button"
          disabled={busy === "consent" || !partnerId || number.trim().length < 6}
          onClick={consent}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          {busy === "consent" ? "Working…" : "Share my number & consent"}
        </button>
      </div>

      {message && (
        <p className="rounded-md border border-[var(--accent)] px-3 py-2 text-xs" style={{ color: "var(--accent)" }}>
          {message}
        </p>
      )}

      {data && data.consents.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-3 py-2 font-medium">Partner</th>
                <th className="px-3 py-2 font-medium">Number</th>
                <th className="px-3 py-2 font-medium">Consented</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.consents.map((c) => {
                const grant = data.grants.find((g) => g.consentId === c.id);
                const partner = data.partners.find((p) => p.id === c.partnerId);
                return (
                  <tr key={c.id} className="border-b border-[var(--border)] align-top">
                    <td className="px-3 py-2">{partner?.name ?? c.partnerId}</td>
                    <td className="px-3 py-2 font-mono">{c.number}</td>
                    <td className="px-3 py-2 text-[var(--muted)]">{formatTime(c.at)}</td>
                    <td className="px-3 py-2">
                      {c.withdrawnAt ? (
                        <span
                          className="rounded-full border px-2 py-0.5 text-xs"
                          style={{ color: "var(--warning)", borderColor: "var(--warning)" }}
                        >
                          withdrawn — purge notice sent ({formatTime(c.withdrawnAt)})
                        </span>
                      ) : (
                        <span
                          className="rounded-full border px-2 py-0.5 text-xs"
                          style={{ color: "var(--success)", borderColor: "var(--success)" }}
                        >
                          active — lead delivered{grant ? ` (+€${grant.userRewardEur.toFixed(2)} credit)` : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {!c.withdrawnAt && (
                        <button
                          type="button"
                          disabled={busy === c.id}
                          onClick={() => revoke(c.id)}
                          className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
                        >
                          {busy === c.id ? "Working…" : "Withdraw consent"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
