import LeadMarketplace from "@/components/LeadMarketplace";

export const metadata = {
  title: "Offers — opt-in lead marketplace — DNA Security Assistant",
  description:
    "Choose which verified partners may contact you with offers. Share your own number for service credit, withdraw anytime — the partner must then purge the lead.",
};

export default function OffersPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Offers — the opt-in lead marketplace</h1>
        <p className="max-w-2xl text-sm text-[var(--muted)]">
          Partners can reach you with offers only when you say so. You pick the partner, share
          your own number, earn service credit — and withdrawing consent deletes the lead from
          the partner&#39;s systems. The shield never turns a reported scammer into a sales lead;
          this marketplace runs on consent, not retaliation.
        </p>
      </header>

      <LeadMarketplace />

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-medium">The rules</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-[var(--muted)]">
          <li>• Only your own number, only partners you explicitly chose — one consent per partner.</li>
          <li>
            • Each consented lead earns you a €2.00 service credit; the partner pays the platform
            a €6.00 commission. On withdrawal both sides are voided.
          </li>
          <li>
            • Withdraw anytime: the lead is voided, your reward is revoked and the partner receives
            a formal purge notice (GDPR Art. 7(3), 17(1)(b), 19).
          </li>
          <li>
            • Numbers reported as scams go to the shield feed for blocking only — never to this
            marketplace, never to sales (see <span className="font-medium">Misuse &amp; policy</span>).
          </li>
        </ul>
      </section>
    </main>
  );
}
