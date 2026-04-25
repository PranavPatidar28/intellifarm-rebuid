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
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div
        className={cn(
          "mx-auto max-w-[1500px]",
          showNav && "xl:grid xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-8",
        )}
      >
        {showNav ? <AppNavigation mode={mode} /> : null}
        <div className="min-w-0">
          <header
            className={cn(
              "mb-6 md:mb-8 overflow-hidden rounded-3xl border border-border/50",
              mode === "default" 
                 ? "bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground p-6 md:p-10 shadow-lg" 
                 : "bg-card text-card-foreground p-6 md:p-8 shadow-sm",
              className,
            )}
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="max-w-3xl">
                  <p className={cn("text-xs font-bold uppercase tracking-widest", mode === "default" ? "text-primary-foreground/70" : "text-muted-foreground")}>{eyebrow}</p>
                  <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
                    {title}
                  </h1>
                  {description ? (
                    <p
                      className={cn(
                        "mt-4 max-w-2xl text-base leading-relaxed",
                        mode === "default" ? "text-primary-foreground/90" : "text-muted-foreground",
                      )}
                    >
                      {description}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 self-start">
                  <Link
                    href="/profile"
                    className={cn("inline-flex h-10 w-10 items-center justify-center rounded-full transition xl:hidden", mode === "default" ? "bg-white/10 hover:bg-white/20 text-white" : "bg-secondary hover:bg-secondary/80")}
                  >
                    <CircleUserRound className="h-5 w-5" />
                  </Link>
                  <LanguageSwitcher compact={mode === "default"} />
                </div>
              </div>
              {actions ? <div className="flex flex-wrap gap-3 mt-2">{actions}</div> : null}
            </div>
          </header>
          <main className="pb-28 xl:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">{children}</main>
        </div>
      </div>
      {showNav ? <BottomNav /> : null}
    </div>
  );
}
