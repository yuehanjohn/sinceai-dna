import Link from "next/link";

const tiers = [
  {
    name: "Shield",
    price: "Free",
    tagline: "The safety net, for everyone",
    highlight: false,
  },
  {
    name: "Plus",
    price: "4,99 \u20ac / month",
    tagline: "The full assistant",
    highlight: true,
  },
  {
    name: "Business",
    price: "9,90 \u20ac / user / month",
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
    { label: "Shield log of calls and texts", shield: true, plus: true, business: true },
    { label: "Block & report in one tap", shield: true, plus: true, business: true },
    {
      label: "Full assistant chat — messages, links, breach notices",
      shield: false,
      plus: true,
      business: true,
    },
    {
      label: "Consent-gated monitoring signals (network status, subscriptions, device)",
      shield: false,
      plus: true,
      business: true,
    },
    { label: "Breach checks on your credentials", shield: false, plus: true, business: true },
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
        Simple pricing, protective by default
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">
        The call shield is free. You pay for the conversation and the watching —
        and a human is never more than one step away.
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
              <th className="px-4 py-3 font-medium">Shield</th>
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
        Prices are packaging placeholders for the challenge demo, not a live
        commercial offer. The partner network is compensated through a revenue
        share of subscription profits — see{" "}
        <Link href="/partners" className="text-[var(--accent)] hover:underline">
          Partners
        </Link>
        .
      </p>

      <div className="mt-12 rounded-xl border border-[var(--border)] p-6 text-center">
        <p className="text-[var(--muted)]">
          Not sure yet? The free Shield covers every incoming call and text.
        </p>
        <Link
          href="/assistant"
          className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
        >
          Open the assistant
        </Link>
      </div>
    </main>
  );
}
