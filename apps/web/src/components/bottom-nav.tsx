"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { mobileNavItems } from "./layout/navigation";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4 xl:hidden">
      <div className="pointer-events-auto flex w-full max-w-sm justify-between rounded-[var(--radius-panel)] border border-[var(--border)] bg-card/94 px-3 py-2 shadow-[var(--shadow-2)] backdrop-blur-xl">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            item.match?.some((match) => pathname.startsWith(match));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] p-2 transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
