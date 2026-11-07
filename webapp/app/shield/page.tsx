import Link from "next/link";
import CallShield from "@/components/CallShield";

export const metadata = {
  title: "Call Shield — DNA Security Assistant",
  description:
    "Screen an incoming call, auto-save suspicious callers and block, report or escalate in one click.",
};

export default function ShieldPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Call Shield</h1>
        <p className="max-w-2xl text-sm text-[var(--muted)]">
          A suspicious call comes in — Call Shield screens it, warns you, auto-saves the caller to
          your Shield log and gives you one-click actions to block, report and escalate. Demo data
          only.
        </p>
      </header>
      <CallShield />

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
        <h2 className="font-medium">Verified offers, on your terms</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--muted)]">
          Want offers from vetted partners? Share your own number only with partners you choose —
          and withdraw anytime. Scam callers never enter that marketplace.
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
