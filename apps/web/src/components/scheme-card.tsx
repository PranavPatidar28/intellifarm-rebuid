import { ArrowUpRight, BadgeCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";

type SchemeCardProps = {
  scheme: {
    id: string;
    title: string;
    titleHi?: string | null;
    description: string;
    descriptionHi?: string | null;
    category: string;
    applicableState: string;
    officialLink: string;
  };
};

export function SchemeCard({ scheme }: SchemeCardProps) {
  return (
    <article className="surface-card rounded-[var(--radius-card)] p-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{scheme.category}</Badge>
          <Badge tone="accent">{scheme.applicableState}</Badge>
          <Badge tone="info">
            <BadgeCheck className="h-3.5 w-3.5" />
            Official source
          </Badge>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            {scheme.title}
          </h3>
          {scheme.titleHi ? <p className="text-sm muted">{scheme.titleHi}</p> : null}
          <p className="text-sm leading-6 muted">{scheme.description}</p>
        </div>

        <a
          href={scheme.officialLink}
          target="_blank"
          rel="noreferrer"
          className={buttonStyles({ variant: "secondary" })}
        >
          Open official link
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}
