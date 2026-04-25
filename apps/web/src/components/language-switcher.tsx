"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const [language, setLanguage] = useState<"en" | "hi">(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.localStorage.getItem("preferredLanguage");
    return saved === "hi" ? "hi" : "en";
  });

  const toggleLanguage = () => {
    const next = language === "en" ? "hi" : "en";
    setLanguage(next);
    window.localStorage.setItem("preferredLanguage", next);
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-4 py-2 text-sm font-medium transition",
        compact
          ? "border border-white/18 bg-white/12 text-white hover:bg-white/18"
          : "border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
      )}
      title="Sets the preferred language for audio and future language support."
    >
      <span
        className={cn(
          "rounded-full px-2 py-1 text-xs font-semibold",
          compact ? "bg-white/14" : "bg-[var(--brand-soft)] text-[var(--brand)]",
        )}
      >
        {language === "en" ? "EN" : "HI"}
      </span>
      <span>{language === "en" ? "Audio in English" : "Audio in Hindi"}</span>
    </button>
  );
}
