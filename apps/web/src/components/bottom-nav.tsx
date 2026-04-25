"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { mobileNavItems } from "./layout/navigation";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-6 z-50 px-4 xl:hidden pointer-events-none flex justify-center">
      <div className="pointer-events-auto flex w-full max-w-sm justify-between rounded-full border border-border bg-background/90 px-4 py-2 shadow-lg backdrop-blur-xl">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            item.match?.some((match) => pathname.startsWith(match));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 rounded-full p-2 transition-all ${
                active
                  ? "bg-primary text-primary-foreground scale-110 shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
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
