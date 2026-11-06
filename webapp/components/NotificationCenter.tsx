"use client";

import { useState } from "react";

export interface FeedItem {
  id: string;
  title: string;
  body: string;
  at: string;
  tone: "success" | "warning" | "error" | "muted";
}

const TONE_VAR: Record<FeedItem["tone"], string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--error)",
  muted: "var(--muted)",
};

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function NotificationCenter({
  items,
  permission,
  onEnable,
  onClear,
}: {
  items: FeedItem[];
  permission: "unsupported" | "default" | "granted" | "denied" | null;
  onEnable: () => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const unread = items.filter((i) => i.tone !== "muted").length;

  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm transition-colors hover:border-[var(--accent)]"
        aria-label={`Notifications (${unread})`}
      >
        <span aria-hidden>🔔</span>
        <span className="text-[var(--foreground)]">Notifications</span>
        {unread > 0 && (
          <span className="rounded-full bg-[var(--error)] px-1.5 text-xs font-semibold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-96 max-w-[90vw] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Detection feed</h3>
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
            >
              Clear
            </button>
          </div>

          {permission && permission !== "granted" && permission !== "unsupported" && (
            <button
              type="button"
              onClick={onEnable}
              className="mt-3 w-full rounded-md border border-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_15%,transparent)]"
            >
              Enable phone-style notifications for scam detections
            </button>
          )}

          <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
            {items.length === 0 ? (
              <p className="py-2 text-sm text-[var(--muted)]">
                Nothing yet — detections appear here as calls arrive.
              </p>
            ) : (
              items.map((i) => (
                <div
                  key={i.id}
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{
                    borderColor: TONE_VAR[i.tone],
                    color: i.tone === "muted" ? "var(--muted)" : TONE_VAR[i.tone],
                  }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{i.title}</span>
                    <span className="text-xs opacity-70">{timeLabel(i.at)}</span>
                  </div>
                  <div className="mt-0.5 text-xs opacity-90">{i.body}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
