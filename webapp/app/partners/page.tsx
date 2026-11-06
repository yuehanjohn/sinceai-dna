import Link from "next/link";

const partners = [
  {
    title: "Network-level filtering",
    desc: "Verified scam-number reports feed blocking at the network edge, before calls and texts reach more customers.",
  },
  {
    title: "Traficom — National Cyber Security Centre",
    desc: "Reports on phishing and fraud campaigns are routed to Traficom\u2019s official channels in structured form.",
  },
  {
    title: "Bank fraud lines",
    desc: "When money has already moved, the assistant prepares the handoff and the customer reaches their bank\u2019s fraud line directly.",
  },
  {
    title: "Device-security vendors",
    desc: "Consent-based device signals — app installs, remote-access apps — enrich vendor detection and vendor findings enrich the assistant.",
  },
];

export default function PartnersPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Partners make the shield stronger
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">
        The assistant sits on the user&#39;s side. Our partners make the
        blocking, the reporting and the handoffs real — and share in the
        subscription revenue they help create.
      </p>

      {/* Who we work with */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">Who we work with</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {partners.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
            >
              <h3 className="font-medium">{p.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What partners get */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">
          What partners get
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] p-6">
            <h3 className="font-medium text-[var(--success)]">
              Verified, consent-based scam reports
            </h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              When a user reports a number that scammed them, the report is
              verified against the assistant&#39;s case and consented by the
              user before it feeds network-level blocking.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-6">
            <h3 className="font-medium text-[var(--success)]">
              Revenue share from subscription profits
            </h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Partners providing verification and blocking capacity receive a
              share of subscription profits — the value flows from the service
              users pay for, not from the users themselves.
            </p>
          </div>
        </div>
      </section>

      {/* Anti-pattern callout */}
      <section className="mt-12 rounded-xl border-2 border-[var(--error)] p-6">
        <h2 className="font-semibold text-[var(--error)]">
          What partners never receive
        </h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          <li className="flex gap-2">
            <span className="text-[var(--error)]">✗</span>
            <span>
              User contact lists — partner reports never contain other users&#39;
              details.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--error)]">✗</span>
            <span>
              Marketing leads — a security report is never turned into a sales
              audience.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-[var(--error)]">✗</span>
            <span>
              Consent-less sign-ups — nothing is ever activated on a user&#39;s
              account without their explicit consent.
            </span>
          </li>
        </ul>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Every report concerns numbers that users reported as the ones scamming{" "}
          <em>them</em>. Nothing else is shared, with anyone, for any reason.
        </p>
      </section>

      <div className="mt-12 rounded-xl border border-[var(--border)] p-6 text-center">
        <p className="text-[var(--muted)]">
          The assistant also refuses to be turned into a weapon. Read where the
          line is drawn.
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
