"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";

import { Button } from "./button";

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-[rgba(24,35,27,0.28)] transition",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute inset-x-0 bottom-0 rounded-t-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-[var(--shadow-3)] transition md:inset-y-0 md:right-0 md:left-auto md:w-[420px] md:rounded-none md:rounded-l-[1.5rem]",
          open ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{title}</p>
            {description ? <p className="mt-2 text-sm muted">{description}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close drawer">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
