import LeadMarketplace from "@/components/LeadMarketplace";

export const metadata = {
  title: "Offers — consented leads for your own number",
  description:
    "The other commerce path: share your own number with chosen partners for a service credit, withdraw anytime — the partner must then purge the lead.",
};

export default function OffersPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Offers — your own number, on your terms</h1>
        <p className="max-w-2xl text-sm text-[var(--muted)]">
          Firing back sends the <em>caller&#39;s</em> number to the sales field as a weak lead. This
          is the other half: your own number, shared only with partners you pick, for a service
          credit — consented, therefore a <strong>strong</strong> lead, therefore paid for by the
          partner. Withdrawing deletes it from their systems.
        </p>
      </header>

      <LeadMarketplace />

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-medium">The rules</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-[var(--muted)]">
          <li>• Only your own number, only partners you chose — one consent per partner.</li>
          <li>
            • Each consented lead earns you a €2.00 service credit; the partner pays the platform
            €6.00. Withdrawal voids both.
          </li>
          <li>
            • Withdraw anytime: the lead is voided, your reward revoked and the partner gets a purge
            notice (GDPR Art. 7(3), 17(1)(b), 19).
          </li>
          <li>
            • A number you reported as a <em>scammer</em> travels the other path — fired back from{" "}
            <span className="font-medium">FireBack</span> as a weak lead, never listed here.
          </li>
        </ul>
      </section>
    </main>
  );
}
