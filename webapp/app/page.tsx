import Link from "next/link";

const journeys = [
  {
    title: "Suspicious message",
    desc: "A text, email or letter that asks for fees, codes or urgency — checked against operator-side signals.",
  },
  {
    title: "Clicked link",
    desc: "You opened a link, typed card details or installed an app — or clicked and did nothing else.",
  },
  {
    title: "Suspicious call",
    desc: "\u201cBank security\u201d or \u201coperator SIM upgrade\u201d on the line — and the network can warn you live.",
  },
  {
    title: "Breach notice",
    desc: "A leaked credential, an approval-prompt storm or an eSIM activation you did not order.",
  },
  {
    title: "Business incident",
    desc: "A staff member, a supplier\u2019s \u201cnew\u201d bank details or an odd order on the company account.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      {/* Hero */}
      <section className="flex flex-col items-start gap-6 py-10">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          One clear, proportionate next step when something feels wrong
        </h1>
        <p className="max-w-2xl text-lg text-[var(--muted)]">
          The DNA Security Assistant lives inside the operator app and the
          business portal. It turns a suspicious message, call, link or device
          event into one safe next step — in Finnish, English or Swedish.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/assistant"
            className="rounded-lg bg-[var(--accent)] px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
          >
            Try the assistant
          </Link>
          <Link
            href="/shield"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 font-medium transition-colors hover:border-[var(--accent)]"
          >
            See the call shield
          </Link>
        </div>
      </section>

      {/* Five-journey grid */}
      <section className="py-10">
        <h2 className="text-2xl font-semibold tracking-tight">
          Five journeys, one assistant
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {journeys.map((j) => (
            <div
              key={j.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
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
        Every case, number and message in this demo is invented for the
        hackathon. Nothing here touches customer data, telemetry or live
        operator APIs.
      </section>
    </main>
  );
}
