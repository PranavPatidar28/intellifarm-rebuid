import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Bug,
  ChartColumnBig,
  CircleCheckBig,
  ScrollText,
  Sprout,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

const actions = [
  {
    href: "#tasks",
    title: "Finish weekly work",
    description: "Start with due tasks and quick status updates.",
    icon: CircleCheckBig,
    badge: "Today",
  },
  {
    href: "/disease-help",
    title: "Report crop issue",
    description: "Capture symptoms and get a safe next step.",
    icon: Bug,
    badge: "Risk",
  },
  {
    href: "/assistant",
    title: "Ask support",
    description: "Use saved farm context before making a field decision.",
    icon: Bot,
    badge: "Support",
  },
  {
    href: "/crop-prediction",
    title: "Plan the next crop",
    description: "Compare likely crop fit before the season starts.",
    icon: Sprout,
    badge: "Plan",
  },
  {
    href: "/markets",
    title: "Check market prices",
    description: "Review nearby mandi signals before moving produce.",
    icon: ChartColumnBig,
    badge: "Market",
  },
  {
    href: "/schemes",
    title: "Review schemes",
    description: "See official programs that match your state and crop.",
    icon: ScrollText,
    badge: "Scheme",
  },
];

export function QuickActionGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="surface-card group flex min-h-44 flex-col justify-between rounded-[var(--radius-card)] p-5 transition duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)]"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[var(--brand-soft)] text-[var(--brand)]">
                  <Icon className="h-5 w-5" />
                </span>
                <Badge tone="brand">{action.badge}</Badge>
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold text-[var(--foreground)]">
                  {action.title}
                </p>
                <p className="text-sm leading-6 muted">{action.description}</p>
              </div>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--brand)]">
              Open action
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
