"use client";

import { useState } from "react";
import { channelById, KIND_LABELS, WEAK_LEAD_SHARE_EUR } from "@/lib/shield/channels";
import { FlameIcon } from "@/components/icons";
import type { ChannelKind, Submission } from "@/lib/shield/types";

const GROUP_ORDER: ChannelKind[] = ["marketplace_listing", "real_estate", "sales", "harasser_site"];

const STATUS_TONE: Record<Submission["status"], string> = {
  queued: "var(--warning)",
  delivered: "var(--success)",
  purged: "var(--error)",
};

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * The fire-back board: every form that left on the caller's behalf, grouped by
 * channel kind, with the payload as filled. Read-only — CallShield owns the
 * fetch; the server promotes scheduled deliveries and this board polls it.
 */
export default function FanoutConsole({
  number,
  submissions,
}: {
  number: string;
  submissions: Submission[];
}) {
  const [open, setOpen] = useState<string | null>(null);

  const delivered = submissions.filter((s) => s.status === "delivered").length;
  const queued = submissions.filter((s) => s.status === "queued").length;
  const purged = submissions.filter((s) => s.status === "purged").length;
  const cost = Math.round(submissions.length * WEAK_LEAD_SHARE_EUR * 100) / 100;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">
            Fired back — <span className="font-mono">{number}</span>
          </h4>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {submissions.length} forms filled with the caller&#39;s number. Nobody consented — that
            is why it is a <em>weak</em> lead, paid from the subscription fund (€{cost.toFixed(2)}{" "}
            across this fan-out), not by you.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {queued > 0 && (
            <span className="rounded-full border px-2 py-0.5" style={{ color: "var(--warning)", borderColor: "var(--warning)" }}>
              {queued} queued
            </span>
          )}
          <span className="rounded-full border px-2 py-0.5" style={{ color: "var(--success)", borderColor: "var(--success)" }}>
            {delivered} delivered
          </span>
          {purged > 0 && (
            <span className="rounded-full border px-2 py-0.5" style={{ color: "var(--error)", borderColor: "var(--error)" }}>
              {purged} purged
            </span>
          )}
        </div>
      </div>

      {GROUP_ORDER.map((kind) => {
        const group = submissions.filter((s) => s.channelKind === kind);
        if (group.length === 0) return null;
        const harasserExtra = kind === "harasser_site";
        return (
          <div
            key={kind}
            className={
              harasserExtra
                ? "flex flex-col gap-1.5 rounded-lg border border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] p-2.5"
                : "flex flex-col gap-1.5"
            }
          >
            <div
              className="flex flex-wrap items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
              style={harasserExtra ? { color: "var(--warning)" } : { color: "var(--muted)" }}
            >
              {harasserExtra && <FlameIcon className="h-3.5 w-3.5" />}
              {KIND_LABELS[kind]} · {group.length}
              {harasserExtra && (
                <span className="font-normal normal-case tracking-normal text-[var(--muted)]">
                  — the extra group, harassers only
                </span>
              )}
            </div>
            {group.map((sub) => (
              <div key={sub.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)]">
                <button
                  type="button"
                  onClick={() => setOpen((cur) => (cur === sub.id ? null : sub.id))}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
                >
                  <span className="truncate">{sub.channelName}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs">
                    <span style={{ color: STATUS_TONE[sub.status] }}>
                      {sub.status}
                      {sub.status === "queued" ? ` ${timeLabel(sub.deliverAt)}` : ""}
                      {sub.purgedAt ? ` ${timeLabel(sub.purgedAt)}` : ""}
                    </span>
                    <span className="text-[var(--muted)]">{open === sub.id ? "hide form" : "form"}</span>
                  </span>
                </button>
                {open === sub.id && (
                  <div className="border-t border-[var(--border)] px-3 py-2">
                    <p className="mb-1 text-xs text-[var(--muted)]">{channelById(sub.channelId)?.why}</p>
                    <ul className="flex flex-col gap-0.5 font-mono text-xs">
                      {Object.entries(sub.payload).map(([k, v]) => (
                        <li key={k} className="break-words">
                          <span className="text-[var(--muted)]">{k}: </span>
                          {v}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      <p className="text-xs text-[var(--muted)]">
        A purged line means the number was pulled back with a removal notice — see{" "}
        <span className="font-medium">Misuse &amp; policy</span>.
      </p>
    </div>
  );
}
