import Link from "next/link";
import { PARTNER_FUND_SHARE, PLUS_PRICE_EUR, partnerFundPerSubscriberEur, WEAK_LEAD_SHARE_EUR, fanoutPlan } from "@/lib/shield/channels";

const tiers = [
  {
    name: "Detect",
    price: "Free",
    tagline: "Detection, warnings and the saved number",
    highlight: false,
  },
  {
    name: "Plus",
    price: `${PLUS_PRICE_EUR.toFixed(2).replace(".", ",")} € / month`,
    tagline: "Fire back, the full assistant, monitoring",
    highlight: true,
  },
  {
    name: "Business",
    price: "9,90 € / user / month",
    tagline: "For small businesses",
    highlight: false,
  },
];

type Cell = boolean | string;

const features: { label: string; shield: Cell; plus: Cell; business: Cell }[] =
  [
    {
      label: "Scam-call warnings from the network",
      shield: true,
      plus: true,
      business: true,
    },
    { label: "FireBack log of calls and texts", shield: true, plus: true, business: true },
    { label: "Auto-save of the detected number", shield: true, plus: true, business: true },
    { label: "Block & report in one tap", shield: true, plus: true, business: true },
    {
      label: `Fire back — the caller's number into ${fanoutPlan(false).length} real forms (${fanoutPlan(true).length} for a harasser)`,
      shield: false,
      plus: true,
      business: true,
    },
    {
      label: "Weak-lead trail: who holds the number, and purge notices when it is pulled",
      shield: false,
      plus: true,
      business: true,
    },
    {
      label: "Full assistant chat — messages, links, breach notices",
      shield: false,
      plus: true,
      business: true,
    },
    {
      label: "Consent-gated monitoring signals (network, subscriptions, device)",
      shield: false,
      plus: true,
      business: true,
    },
    { label: "Breach checks on your credentials", shield: false, plus: true, business: true },
    {
      label: "Opt-in partner offers on your own number — earn €2 credit per consented lead",
      shield: false,
      plus: true,
      business: true,
    },
    {
      label: "Business portal with shared company view",
      shield: false,
      plus: false,
      business: true,
    },
    {
      label: "Staff incident handling (CEO fraud, supplier bank changes)",
      shield: false,
      plus: false,
      business: true,
    },
    {
      label: "Two-person approval guidance for payments and account changes",
      shield: false,
      plus: false,
      business: true,
    },
  ];

function CellValue({ value }: { value: Cell }) {
  if (value === true) {
    return <span className="text-[var(--success)]">✓</span>;
  }
  if (value === false) {
    return <span className="text-[var(--muted)]">–</span>;
  }
  return <span className="text-xs text-[var(--muted)]">{value}</span>;
}

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Free to be warned. Paid to answer back.
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">
        The free tier detects, warns and saves the number. Plus turns that into action — the caller
        into {fanoutPlan(false).length} sales pipelines, {fanoutPlan(true).length} if they are a
        harasser. Business adds the portal and the incident work.{" "}
        {Math.round(PARTNER_FUND_SHARE * 100)} % of subscription profit — €
        {partnerFundPerSubscriberEur().toFixed(2)} per Plus subscriber per month — funds the partner
        network at €{WEAK_LEAD_SHARE_EUR.toFixed(2)} per delivered weak lead. You never pay a
        partner; your scammer pays nothing at all.
      </p>

      {/* Tier cards */}
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={
              t.highlight
                ? "relative rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] p-6"
                : "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
            }
          >
            {t.highlight && (
              <span className="absolute -top-3 left-6 rounded-full bg-[var(--accent)] px-3 py-0.5 text-xs font-medium text-white">
                Full assistant
              </span>
            )}
            <h2 className="text-lg font-medium">{t.name}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{t.tagline}</p>
            <p className="mt-4 text-2xl font-semibold tracking-tight">
              {t.price}
            </p>
          </div>
        ))}
      </div>

      {/* Feature matrix */}
      <section className="mt-12 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-left">
              <th className="px-4 py-3 font-medium">Feature</th>
              <th className="px-4 py-3 font-medium">Detect</th>
              <th className="px-4 py-3 font-medium">Plus</th>
              <th className="px-4 py-3 font-medium">Business</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.label} className="border-b border-[var(--border)]">
                <td className="px-4 py-3">{f.label}</td>
                <td className="px-4 py-3">
                  <CellValue value={f.shield} />
                </td>
                <td className="px-4 py-3">
                  <CellValue value={f.plus} />
                </td>
                <td className="px-4 py-3">
                  <CellValue value={f.business} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-6 text-xs text-[var(--muted)]">
        Packaging placeholders, not a live price list. See{" "}
        <Link href="/partners" className="text-[var(--accent)] hover:underline">
          Partners
        </Link>
        ; offer credits on{" "}
        <Link href="/offers" className="text-[var(--accent)] hover:underline">
          Offers
        </Link>{" "}
        are the consent path for your own number, and withdraw with you.
      </p>

      <div className="mt-12 rounded-xl border border-[var(--border)] p-6 text-center">
        <p className="text-[var(--muted)]">
          Not sure yet? The free tier already catches every incoming call and saves the number.
        </p>
        <Link
          href="/shield"
          className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
        >
          See FireBack
        </Link>
      </div>
    </main>
  );
}
