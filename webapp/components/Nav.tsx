"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/assistant", label: "Assistant" },
  { href: "/shield", label: "Call Shield" },
  { href: "/pricing", label: "Pricing" },
  { href: "/partners", label: "Partners" },
  { href: "/misuse", label: "Misuse & policy" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-[var(--foreground)]"
        >
          DNA Security Assistant
        </Link>
        <div className="flex flex-wrap items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  active
                    ? "rounded-lg bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--accent)]"
                    : "rounded-lg px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                }
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
