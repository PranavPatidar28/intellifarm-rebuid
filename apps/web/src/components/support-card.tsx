import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type SupportCardProps = {
  href: string;
  title: string;
  description: string;
  detail: string;
  icon: LucideIcon;
};

export function SupportCard({
  href,
  title,
  description,
  detail,
  icon: Icon,
}: SupportCardProps) {
  return (
    <Link
      href={href}
      className="surface-card group block rounded-[var(--radius-panel)] p-5 transition duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)]"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[var(--brand-soft)] text-[var(--brand)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <Badge tone="brand">Support tool</Badge>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-[var(--foreground)]">
              {title}
            </p>
            <p className="text-sm leading-6 muted">{description}</p>
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand)]">
            {detail}
            <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
