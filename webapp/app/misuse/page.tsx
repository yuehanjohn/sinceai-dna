import Link from "next/link";

const neverDo = [
  {
    title: "Post numbers publicly",
    desc: "The service never publishes scam or reported numbers on public pages, social media or comment threads.",
  },
  {
    title: "Submit third parties to sales or lead forms",
    desc: "Reported numbers are never entered into sales, marketing or lead-generation forms of any organisation.",
  },
  {
    title: "Sign anyone up for services",
    desc: "The service never subscribes, orders or enrolls any person — reported or not — into any service.",
  },
  {
    title: "Coordinate harassment",
    desc: "The service never organises calls, texts, posts or campaigns directed at another person.",
  },
];

const legitimateRoutes = [
  {
    title: "Block on device",
    desc: "The fastest first step: block the number on the device and stop engaging with the conversation.",
  },
  {
    title: "Operator network report",
    desc: "Report the number through the assistant — a verified, consent-based report to the operator feeds network-level blocking.",
  },
  {
    title: "Traficom report",
    desc: "Phishing and fraud campaigns are reported to Traficom, the National Cyber Security Centre.",
  },
  {
    title: "Police report",
    desc: "Where a crime has happened, the assistant helps you prepare the facts for a police report.",
  },
];

export default function MisusePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        The service refuses retaliation
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">
        Being scammed is painful, and the wish to hit back is real. The DNA
        Security Assistant is built to protect the person who reports — it is
        not a tool for taking action against a third party. It will refuse any
        request to retaliate, and it says so plainly.
      </p>

      {/* Refused actions */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">
          What it will not do
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {neverDo.map((n) => (
            <div
              key={n.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
            >
              <h3 className="font-medium text-[var(--error)]">{n.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{n.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Consequences */}
      <section className="mt-12 rounded-xl border-2 border-[var(--warning)] bg-[var(--surface)] p-6">
        <h2 className="font-semibold text-[var(--warning)]">
          What happens if misuse is attempted
        </h2>
        <p className="mt-3 text-sm">
          When the service detects an attempt to use it for retaliation, the
          account is suspended — and a notification is drafted to partner
          organisations to remove related reports from their databases.
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Reports made in bad faith do not keep protecting anyone. They are
          pulled back, so a false report never becomes a permanent record.
        </p>
      </section>

      {/* Legitimate routes */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">
          What to do instead
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Every one of these routes is proportionate, official and effective —
          the assistant will walk you through it.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {legitimateRoutes.map((r) => (
            <div
              key={r.title}
              className="rounded-xl border border-[var(--border)] p-6"
            >
              <h3 className="font-medium text-[var(--success)]">{r.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-12 rounded-xl border border-[var(--border)] p-6 text-center">
        <p className="text-[var(--muted)]">
          The call shield reports and blocks within your own device and network
          — see how it works.
        </p>
        <Link
          href="/shield"
          className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90"
        >
          See the call shield
        </Link>
      </div>
    </main>
  );
}
