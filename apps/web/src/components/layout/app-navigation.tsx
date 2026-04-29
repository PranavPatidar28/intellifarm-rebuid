"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, LogOut, ShieldCheck } from "lucide-react";

import { useSession } from "@/lib/session";

import { buttonStyles } from "../ui/button";
import { getDesktopNavItems } from "./navigation";

export function AppNavigation({
  mode,
}: {
  mode: "default" | "admin";
}) {
  const pathname = usePathname();
  const { user } = useSession();
  const items = getDesktopNavItems(user?.role ?? null);

  return (
    <aside className="surface-card-strong sticky top-6 hidden min-h-[calc(100vh-3rem)] flex-col justify-between p-4 xl:flex">
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 pt-1">
          <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--brand-soft)] text-[var(--brand)]">
            <Leaf className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-semibold text-[var(--brand)]">Intellifarm</p>
            <p className="text-xs font-medium muted">
              {mode === "admin" ? "Admin console" : "Field console"}
            </p>
          </div>
        </div>

        <div className="rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <p className="eyebrow">Today focus</p>
          <p className="mt-2 text-sm leading-6 muted">
            {mode === "admin"
              ? "Review crop rules, schemes, and report operations."
              : "Weather, tasks, markets, and support in one calm place."}
          </p>
        </div>

        <nav className="space-y-1" aria-label="Primary navigation">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              item.match?.some((match) => pathname.startsWith(match));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-[var(--radius-card)] px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--brand-soft)] text-[var(--brand)] shadow-sm"
                    : "text-[var(--foreground-soft)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] ${
                    active ? "bg-white/70 dark:bg-white/10" : "bg-[var(--surface-muted)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-4 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
        <div>
          <p className="eyebrow">Signed in</p>
          <p className="mt-2 text-lg font-semibold">{user?.name || "Farmer account"}</p>
          <p className="mt-1 text-sm muted">
            {user?.district && user?.state
              ? `${user.district}, ${user.state}`
              : "Update the profile to improve location-aware guidance."}
          </p>
        </div>
        <div className="grid gap-2">
          <Link href="/profile" className={buttonStyles({ variant: "secondary", size: "md", block: true })}>
            <ShieldCheck className="h-4 w-4" />
            Profile and preferences
          </Link>
          <Link href="/login" className={buttonStyles({ variant: "ghost", size: "md", block: true })}>
            <LogOut className="h-4 w-4" />
            Switch account
          </Link>
        </div>
      </div>
    </aside>
  );
}
