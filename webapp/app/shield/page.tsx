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
    </main>
  );
}
