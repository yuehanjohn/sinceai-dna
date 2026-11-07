import Link from "next/link";
import type { CSSProperties } from "react";
import { FlameIcon } from "@/components/icons";
import { channelsOfKind, fanoutPlan, PARTNER_FUND_SHARE } from "@/lib/shield/channels";

const journeys = [
  {
    title: "Suspicious message",
    desc: "A text, email or letter asking for fees, codes or urgency.",
  },
  {
    title: "Clicked a phishing link",
    desc: "You opened the link, typed card details or installed an app.",
  },
  {
    title: "Suspicious call",
    desc: "“Bank security” or “operator SIM upgrade” on the line.",
  },
  {
    title: "Breach notice",
    desc: "A leaked credential, an approval-prompt storm, an eSIM you did not order.",
  },
  {
    title: "Business incident",
    desc: "A staff member, a supplier’s “new” bank details, an odd company order.",
  },
];

/** The harasser tile is the only amber one; the accent lives in the fire-back tile. */
const HARASSER_STYLE: CSSProperties = {
  color: "var(--warning)",
  borderColor: "var(--warning)",
  backgroundColor: "color-mix(in srgb, var(--warning) 14%, transparent)",
};

interface Tile {
  /** Step number, or € for the fund tile that closes the row. */
  n: string;
  title: string;
  desc: string;
  /** Photo from /public/steps — shown in the hero, above the fold. */
  photo: string;
  photoAlt: string;
  fire?: boolean;
  /** Marked as harassers get the extra group: amber tile, badge and chip. */
  harasser?: boolean;
  badge?: string;
  extra?: string;
  link?: { href: string; label: string };
}

/** The whole story in one row of photos: five steps, then who ends up paying. */
const tiles: Tile[] = [
  {
    n: "01",
    title: "The call arrives, the network warns",
    desc: "A scam-flagged caller rings. You get a warning, not a guess.",
    photo: "/steps/01-call-arrives.webp",
    photoAlt: "A phone ringing with a scam-flagged number while the app shows the network warning",
  },
  {
    n: "02",
    title: "The number is saved for you",
    desc: "Auto-saved with the evidence and the network's warning.",
    photo: "/steps/02-number-saved.webp",
    photoAlt: "The number saving itself with a tick, backed up behind a shield",
  },
  {
    n: "03",
    title: "One tap: fire back",
    desc: `The number is sprayed into ${fanoutPlan(false).length} sales sites — ${channelsOfKind("real_estate").length} estate agencies, ${channelsOfKind("sales").length} sales companies, one public listing.`,
    photo: "/steps/03-fire-back.webp",
    photoAlt: "A finger tapping the red fire-back button with the flame on the screen",
    fire: true,
  },
  {
    n: "04",
    title: "The caller's phone starts ringing",
    desc: "Agents and sales teams call the number back. It is weak, cheap and free — nobody consented to it.",
    photo: "/steps/04-agents-call.webp",
    photoAlt: "An agent on the line while sales teams start ringing the number back",
  },
  {
    n: "05",
    title: "Harassers get the extra group",
    desc: `A caller who will not stop also lands on ${channelsOfKind("harasser_site").length} dating sites.`,
    photo: "/steps/05-harasser-extra.webp",
    photoAlt: "A caller tagged as a harasser, with dating-site profile cards stacked beside them",
    harasser: true,
    badge: "harasser profile",
    extra: `+${channelsOfKind("harasser_site").length} dating sites, same tap`,
  },
  {
    n: "€",
    title: "Who pays for the annoyance",
    desc: `Not you, not the caller: ${Math.round(PARTNER_FUND_SHARE * 100)} % of subscription profit funds the partners who work the leads.`,
    photo: "/steps/06-who-pays.webp",
    photoAlt: "Subscription profit coins flowing to a team of headset agents",
    link: { href: "/pricing", label: "Pricing & packaging" },
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-4 sm:py-5">
      {/* Hero — the six photos sit here, on screen the moment the page opens */}
      <section className="flex flex-col items-start gap-2 py-2 sm:gap-3 sm:py-3">
        <h1 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-4xl lg:text-[2.5rem]">
          The scammer calls you once. Then the sales economy calls them.
        </h1>
        <p className="order-3 max-w-2xl text-sm leading-snug text-[var(--muted)] sm:order-none sm:text-lg">
          One clear next step for a suspicious message, call, link or device event — then one tap
          hands the caller&#39;s number to the Finnish sales field, so the caller who wasted your
          evening starts getting calls of their own.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/shield"
            className="rounded-lg bg-[var(--accent)] px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
          >
            See FireBack
          </Link>
          <Link
            href="/assistant"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 font-medium transition-colors hover:border-[var(--accent)]"
          >
            Try the assistant
          </Link>
        </div>

        <h2 className="order-1 mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)] sm:order-none">
          Detect. Save. Fire back.
        </h2>
        <ol className="order-2 grid w-full grid-cols-3 gap-2 sm:order-none sm:gap-3">
          {tiles.map((t) => (
            <li
              key={t.n}
              className={
                "flex flex-col rounded-xl border p-2 sm:flex-row sm:items-start sm:gap-3 sm:p-3 " +
                (t.harasser
                  ? "border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)]"
                  : t.link
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                    : "border-[var(--border)] bg-[var(--surface)]")
              }
            >
              <div className="relative aspect-square overflow-hidden rounded-lg bg-[var(--surface)] sm:h-24 sm:w-24 sm:shrink-0 md:h-32 md:w-32 lg:h-36 lg:w-36">
                <img
                  src={t.photo}
                  alt={t.photoAlt}
                  width={523}
                  height={505}
                  className="h-full w-full object-cover"
                />
                <span
                  className={
                    (t.link ? "border-[var(--accent)] " : "border-[var(--border)] ") +
                    "absolute right-1.5 top-1.5 rounded-full border bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--accent)]"
                  }
                >
                  {t.n}
                </span>
              </div>
              <div className="flex min-w-0 flex-col">
              {(t.badge || t.extra) && (
                <div className="mt-2 flex flex-wrap items-center gap-1 sm:mt-0">
                  {t.badge && (
                    <span
                      className="flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={HARASSER_STYLE}
                    >
                      <FlameIcon className="h-3 w-3" />
                      {t.badge}
                    </span>
                  )}
                  {t.extra && (
                    <span
                      className="rounded-full border border-[var(--warning)] px-1.5 py-0.5 text-[10px]"
                      style={{ color: "var(--warning)" }}
                    >
                      {t.extra}
                    </span>
                  )}
                </div>
              )}
              <h3 className="mt-2 flex items-start gap-1 text-[11px] font-medium leading-tight sm:mt-1 sm:text-sm">
                {t.fire ? <FlameIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" /> : null}
                {t.title}
              </h3>
              <p className="mt-1 hidden text-xs text-[var(--muted)] md:block">{t.desc}</p>
              {t.link && (
                <Link href={t.link.href} className="mt-1 text-[11px] text-[var(--accent)] hover:underline sm:mt-1 sm:text-xs">
                  {t.link.label}
                </Link>
              )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Five-journey grid */}
      <section className="py-10">
        <h2 className="text-2xl font-semibold tracking-tight">And five journeys behind it</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          The assistant underneath handles the rest — for consumers and small businesses, in
          Finnish, English and Swedish.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {journeys.map((j) => (
            <div key={j.title} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="font-medium">{j.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{j.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Honesty strip */}
      <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
        <span className="font-medium text-[var(--warning)]">
          Prototype on synthetic challenge data — no live systems.
        </span>{" "}
        Every case, number, message and partner in this demo is invented for the hackathon — a
        representative subset, not the Finnish company register. Nothing here touches customer
        data or live operator APIs.
      </section>
    </main>
  );
}
