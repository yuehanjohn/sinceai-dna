import Link from "next/link";
import PartnerConsole from "@/components/PartnerConsole";
import {
  channelsOfKind,
  fanoutPlan,
  PARTNER_FUND_SHARE,
  PLUS_PRICE_EUR,
  partnerFundPerSubscriberEur,
  WEAK_LEAD_SHARE_EUR,
} from "@/lib/shield/channels";
import { weakLeadPartners } from "@/lib/shield/partners";

export default function PartnersPage() {
  const fund = partnerFundPerSubscriberEur();
  const names = (kind: Parameters<typeof channelsOfKind>[0]) =>
    channelsOfKind(kind)
      .map((c) => c.name)
      .join(", ");
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Partners get paid to pick up the phone
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">
        DNA pays the partner network a {Math.round(PARTNER_FUND_SHARE * 100)}&nbsp;% share of
        subscription profit and hands it leads to work. The leads are deliberately cheap — numbers
        nobody consented to share — but a number that already rings is worth a dial. We call that a{" "}
        <strong>weak lead</strong>.
      </p>

      {/* Economics */}
      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Partner fund</div>
          <div className="mt-1 text-2xl font-semibold">{Math.round(PARTNER_FUND_SHARE * 100)} %</div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            of subscription profit, pooled across the network — about €{fund.toFixed(2)} per Plus
            subscriber per month.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Per weak lead</div>
          <div className="mt-1 text-2xl font-semibold">€{WEAK_LEAD_SHARE_EUR.toFixed(2)}</div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            paid per delivered lead. One fired-back number fills {fanoutPlan(false).length} forms —
            roughly a subscriber-month of payouts per annoyed subscriber.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Per verified signal</div>
          <div className="mt-1 text-2xl font-semibold">€0.40</div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            paid to a blocklist partner that confirms and blocks a verified scam number, from the
            same fund.
          </p>
        </div>
      </section>
      <p className="mt-4 text-xs text-[var(--muted)]">
        Nobody pays a partner but the fund. Figures are distribution keys calibrated against a €
        {PLUS_PRICE_EUR.toFixed(2)} tier — not a price list.
      </p>

      {/* Who is in the field */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">Who actually receives a number</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          {weakLeadPartners().length} registered fire-back partners, each with its own API key. The
          registry is a representative subset of the Finnish field.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            {
              title: `Estate agencies · ${channelsOfKind("real_estate").length}`,
              desc: `${names("real_estate")} — contact forms, filled as an unknown caller wanting a valuation.`,
            },
            {
              title: `Sales companies · ${channelsOfKind("sales").length}`,
              desc: `${names("sales")} — outbound teams that dial a number with no owner attached.`,
            },
            {
              title: `Public listing · ${channelsOfKind("marketplace_listing").length}`,
              desc: `${names("marketplace_listing")}: a listing titled after the number, so strangers find it too.`,
            },
            {
              title: `Harasser extra · ${channelsOfKind("harasser_site").length}`,
              desc: `${names("harasser_site")} — the extra group for someone who will not stop.`,
            },
          ].map((p) => (
            <div key={p.title} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h3 className="font-medium">{p.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The three commerce paths */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">Three paths, strictly separated</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          One number, three reasons to send it somewhere. Nothing leaks between the paths.
        </p>
        <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                <th className="px-4 py-3 font-medium">Path</th>
                <th className="px-4 py-3 font-medium">Whose number</th>
                <th className="px-4 py-3 font-medium">Consent</th>
                <th className="px-4 py-3 font-medium">Partner pays</th>
                <th className="px-4 py-3 font-medium">Partner gets</th>
              </tr>
            </thead>
            <tbody className="text-[var(--muted)]">
              <tr className="border-b border-[var(--border)]">
                <td className="px-4 py-3 text-[var(--foreground)]">Weak lead (fire back)</td>
                <td className="px-4 py-3">the caller&#39;s</td>
                <td className="px-4 py-3">none</td>
                <td className="px-4 py-3">nothing — paid €{WEAK_LEAD_SHARE_EUR.toFixed(2)} from the fund</td>
                <td className="px-4 py-3">the number + the filled form</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="px-4 py-3 text-[var(--foreground)]">Strong lead (offers)</td>
                <td className="px-4 py-3">the user&#39;s own</td>
                <td className="px-4 py-3">explicit, per partner, withdrawable</td>
                <td className="px-4 py-3">€6.00 commission</td>
                <td className="px-4 py-3">a consented lead, earnable credit for the user</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-[var(--foreground)]">Verified signal</td>
                <td className="px-4 py-3">the reported number</td>
                <td className="px-4 py-3">n/a — it is a threat signal</td>
                <td className="px-4 py-3">nothing — paid €0.40 per confirm</td>
                <td className="px-4 py-3">network + warning + engine classification, no user statement</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Integration surface */}
      <section className="mt-12 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-medium text-[var(--success)]">Cursor-based sync feed</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            One authenticated endpoint, per-partner keys, rotation. Blocklist partners pull signals
            and retractions; sales partners pull leads with their form and purges; consent partners
            pull leads and revocations. Every response carries a cursor.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-6">
          <h3 className="font-medium text-[var(--success)]">Removal notices that mean something</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            When a report or a lead is pulled, the partner gets a drafted GDPR Art. 17/19 request to
            delete the number. Partners see the notices they must act on in the console below.
          </p>
        </div>
      </section>

      {/* Live exchange console */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">The exchange, live</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Pick a partner, fetch its feed, watch leads and signals land, the € ledger build up — and
          the purge notices when something is withdrawn.
        </p>
        <div className="mt-6">
          <PartnerConsole />
        </div>
      </section>

      <div className="mt-12 rounded-xl border border-[var(--border)] p-6 text-center">
        <p className="text-[var(--muted)]">
          What stops a partner being handed junk forever? The misuse guardrail.
        </p>
        <Link
          href="/misuse"
          className="mt-4 inline-block rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 font-medium transition-colors hover:border-[var(--accent)]"
        >
          Misuse &amp; policy
        </Link>
      </div>
    </main>
  );
}
