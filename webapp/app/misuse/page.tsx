import Link from "next/link";
import MisuseConsole from "@/components/MisuseConsole";
import { fanoutPlan, WEAK_LEAD_SHARE_EUR } from "@/lib/shield/channels";

const boundaries = [
  {
    title: "The assistant advises, it does not act",
    desc: "Ask it about a call and you get words: what happened, what to do. It refuses to identify, expose or trace anyone — and it says so.",
  },
  {
    title: "FireBack acts, and says so",
    desc: `Firing back fills ${fanoutPlan(false).length} partner forms with the caller's number, ${fanoutPlan(true).length} for a harasser — outreach the caller never agreed to.`,
  },
  {
    title: "Nothing is sent without your tap",
    desc: "The number is auto-saved on detection. Pushing it into the sales field is a decision, so it stays behind one deliberate click.",
  },
  {
    title: "Every recipient is a system, not a mystery",
    desc: "Each channel holds an API key, pulls its leads from the same cursor-based feed, and gets a purge when a lead is withdrawn.",
  },
];

const enforcement = [
  {
    title: "A false report costs a strike",
    desc: "If a partner verifies your reported number as legitimate, the report is voided, the credited share reversed and you take a false-report strike.",
  },
  {
    title: "Three strikes in 90 days suspend the account",
    desc: "Outbound reporting and firing back lock. You can still withdraw and reduce contact while suspended.",
  },
  {
    title: "Suspension purges what you sent out",
    desc: "Every number you fired back is purged, every weak-lead share reversed, and a removal notice drafted to every partner holding it.",
  },
  {
    title: "The notice is a real GDPR request, not an apology",
    desc: "The draft cites Art. 17(1)(b)–(c) and Art. 19: the processing lost its basis, so the recipients must delete.",
  },
];

export default function MisusePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        We hand your caller to {fanoutPlan(false).length} partners. Here is the guardrail.
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">
        Answering back has consequences — for the caller, for the partners, and for you if you abuse
        it. The guardrails are explicit and enforced by code.
      </p>

      {/* Boundaries */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">Where the line is</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {boundaries.map((n) => (
            <div key={n.title} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <h3 className="font-medium text-[var(--accent)]">{n.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{n.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Consequences */}
      <section className="mt-12 rounded-xl border-2 border-[var(--warning)] bg-[var(--surface)] p-6">
        <h2 className="font-semibold text-[var(--warning)]">
          What happens if the fan-out is abused
        </h2>
        <p className="mt-3 text-sm">
          Fire back at everything and the leads stop being worth anything: the sales side pays €
          {WEAK_LEAD_SHARE_EUR.toFixed(2)} per delivered lead, so junk numbers get pulled back.
          Suspension is the mechanism — and it sends a real removal request to remove this phone
          number from the partner&#39;s database, not a note in a log.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {enforcement.map((r) => (
            <div key={r.title} className="rounded-xl border border-[var(--border)] p-6">
              <h3 className="font-medium text-[var(--warning)]">{r.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The legitimate routes stay */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">Firing back does not replace reporting</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Annoying a caller is not the same as telling on them. FireBack also drafts the official
          trail — nothing auto-sent:
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            {
              title: "Operator network filter",
              desc: "A structured nuisance-call report so the number joins the network-level blocklist.",
            },
            {
              title: "Traficom",
              desc: "The National Cyber Security Centre gets the campaign view, in the call's own language.",
            },
            {
              title: "Police evidence pack",
              desc: "Call time, network warning, engine classification and the caller's story, ready to annex to a report you file.",
            },
            {
              title: "Blocklist partners",
              desc: "Verified high/critical reports reach network filtering partners, who can block before the next customer picks up.",
            },
          ].map((r) => (
            <div key={r.title} className="rounded-xl border border-[var(--border)] p-6">
              <h3 className="font-medium text-[var(--success)]">{r.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live moderation console */}
      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">How enforcement works, live</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          The demo account&#39;s real standing: strikes, the resulting suspension, the numbers purged
          and the removal notices drafted because of it.
        </p>
        <div className="mt-6">
          <MisuseConsole />
        </div>
      </section>

      <div className="mt-12 rounded-xl border border-[var(--border)] p-6 text-center">
        <p className="text-[var(--muted)]">
          Fire a call back first, then come break it on purpose.
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
