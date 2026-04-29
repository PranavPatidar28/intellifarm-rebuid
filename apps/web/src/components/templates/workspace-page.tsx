"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CircleUserRound } from "lucide-react";

import { cn } from "@/lib/cn";

import { BottomNav } from "../bottom-nav";
import { LanguageSwitcher } from "../language-switcher";
import { AppNavigation } from "../layout/app-navigation";

export function WorkspacePage({
  title,
  description,
  eyebrow = "Workspace",
  actions,
  children,
  mode = "default",
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  mode?: "default" | "focus" | "admin";
  className?: string;
}) {
  const showNav = mode === "default" || mode === "admin";

  return (
    <div className="page-shell">
      <div
        className={cn(
          "app-frame",
          showNav && "xl:grid xl:grid-cols-[272px_minmax(0,1fr)] xl:gap-6",
        )}
      >
        {showNav ? <AppNavigation mode={mode} /> : null}
        <div className="min-w-0">
          <header
            className={cn(
              "mb-5 rounded-[var(--radius-panel)] border border-[var(--border)] bg-card/92 p-4 shadow-[var(--shadow-1)] backdrop-blur md:mb-6 md:p-5",
              mode === "admin" && "bg-[var(--surface-muted)]",
              mode === "focus" && "mx-auto max-w-5xl",
              className,
            )}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="max-w-3xl">
                  <p className="eyebrow">{eyebrow}</p>
                  <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
                    {title}
                  </h1>
                  {description ? (
                    <p className="mt-2 max-w-2xl text-sm leading-6 muted md:text-base">
                      {description}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 self-start">
                  <Link
                    href="/profile"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)] transition hover:bg-[var(--brand-soft)] xl:hidden"
                    aria-label="Open profile"
                  >
                    <CircleUserRound className="h-5 w-5" />
                  </Link>
                  <LanguageSwitcher />
                </div>
              </div>
              {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            </div>
          </header>
          <main className="pb-28 xl:pb-8">{children}</main>
        </div>
      </div>
      {showNav ? <BottomNav /> : null}
    </div>
  );
}
