"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";

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
    <aside className="surface-card-strong sticky top-6 hidden min-h-[calc(100vh-3rem)] flex-col justify-between p-5 xl:flex">
      <div className="space-y-6">
        <div className={mode === "admin" ? "surface-card p-4" : "hero-panel p-5"}>
          <p className={mode === "admin" ? "eyebrow" : "eyebrow"}>Intellifarm</p>
          <h2
            className={
              mode === "admin"
                ? "mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--foreground)]"
                : "mt-3 font-[family-name:var(--font-display)] text-2xl font-semibold text-white"
            }
          >
            {mode === "admin" ? "Admin console" : "Field decision system"}
          </h2>
          <p className={mode === "admin" ? "mt-3 text-sm leading-6 muted" : "mt-3 text-sm leading-6 text-white/78"}>
            {mode === "admin"
              ? "Maintain crop logic, scheme content, and report operations."
              : "Prioritize what matters today across fields, risk, markets, and support."}
          </p>
        </div>

        <nav className="space-y-1" aria-label="Primary">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              item.match?.some((match) => pathname.startsWith(match));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-[var(--radius-card)] px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                    : "text-[var(--foreground-soft)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-[0.85rem] ${
                    active ? "bg-[rgba(30,90,60,0.12)]" : "bg-[var(--surface-muted)]"
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
