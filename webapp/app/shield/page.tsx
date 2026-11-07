import Link from "next/link";
import CallShield from "@/components/CallShield";
import { channelsOfKind, fanoutPlan, PARTNER_FUND_SHARE, WEAK_LEAD_SHARE_EUR } from "@/lib/shield/channels";

export const metadata = {
  title: "FireBack — one tap and the caller becomes a lead",
  description:
    "Detect the scam call, auto-save the number, and fire it back into the Finnish sales economy with one tap.",
};

export default function ShieldPage() {
  const targets = fanoutPlan(false).length;
  const harasserTargets = fanoutPlan(true).length;
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">FireBack — and the caller gets a taste of it</h1>
        <p className="max-w-2xl text-sm text-[var(--muted)]">
          A stranger calls and tries something. The network warns you, FireBack saves the number,
          and one tap sends it into {targets} sales pipelines (
          {channelsOfKind("real_estate").length} estate agencies,{" "}
          {channelsOfKind("sales").length} sales companies, one public listing) as a{" "}
          <em>weak lead</em> — {harasserTargets} when you tag them a harasser. Demo data only.
        </p>
      </header>
      <CallShield />

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-medium">Why it is free for the caller to be annoyed</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-[var(--muted)]">
          <li>
            • Nobody consented to it — that is what makes it a{" "}
            <span className="text-[var(--foreground)]">weak lead</span>: cheap, unqualified, worth a
            dial only because it is already there.
          </li>
          <li>
            • Partners are paid {Math.round(PARTNER_FUND_SHARE * 100)}&nbsp;% of subscription profit,
            at €{WEAK_LEAD_SHARE_EUR.toFixed(2)} per delivered lead. The user never pays a partner;
            the caller pays nothing.
          </li>
          <li>
            • The partner side is real: every channel has an API key and a cursor-based feed on{" "}
            <Link href="/partners" className="text-[var(--accent)] hover:underline">
              the partners page
            </Link>
            .
          </li>
          <li>
            • Abuse it and the leads get pulled: 3 false-report strikes in 90 days suspend the
            account and every holder gets a removal notice. See{" "}
            <Link href="/misuse" className="text-[var(--accent)] hover:underline">
              Misuse &amp; policy
            </Link>
            .
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-medium">And the assistant, which does not act at all</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-[var(--muted)]">
          The same call through the assistant is advice only: it declines to identify or expose
          anyone and stops there. Advice and action are separate jobs.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/assistant"
            className="rounded-lg bg-[var(--accent)] px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
          >
            Open the assistant
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border border-[var(--border)] px-5 py-2.5 font-medium transition-colors hover:border-[var(--accent)]"
          >
            Pricing
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <h2 className="font-medium">Want offers on your own number instead?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--muted)]">
          The other path: share <em>your</em> number with chosen partners, earn service credit,
          withdraw whenever. Consented and paid for — a strong lead.
        </p>
        <Link
          href="/offers"
          className="mt-4 inline-block rounded-lg border border-[var(--border)] px-5 py-2.5 font-medium transition-colors hover:border-[var(--accent)]"
        >
          Open Offers
        </Link>
      </section>
    </main>
  );
}
