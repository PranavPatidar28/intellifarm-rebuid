import {
  ChartColumnBig,
  House,
  LifeBuoy,
  Settings2,
  Sprout,
  Tractor,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  mobile?: boolean;
  desktopGroup?: "farm" | "support" | "account";
  match?: string[];
};

export const mobileNavItems: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Today",
    icon: House,
    mobile: true,
    desktopGroup: "farm",
  },
  {
    href: "/farms",
    label: "Fields",
    icon: Tractor,
    mobile: true,
    desktopGroup: "farm",
    match: ["/farms", "/seasons"],
  },
  {
    href: "/crop-prediction",
    label: "Plan",
    icon: Sprout,
    mobile: true,
    desktopGroup: "farm",
  },
  {
    href: "/support",
    label: "Support",
    icon: LifeBuoy,
    mobile: true,
    desktopGroup: "support",
    match: ["/support", "/assistant", "/disease-help", "/schemes"],
  },
  {
    href: "/markets",
    label: "Market",
    icon: ChartColumnBig,
    mobile: true,
    desktopGroup: "support",
  },
];

export function getDesktopNavItems(role?: "FARMER" | "ADMIN" | null) {
  const items: NavigationItem[] = [
    {
      href: "/dashboard",
      label: "Today",
      icon: House,
      desktopGroup: "farm",
    },
    {
      href: "/farms",
      label: "Fields",
      icon: Tractor,
      desktopGroup: "farm",
      match: ["/farms", "/seasons"],
    },
    {
      href: "/crop-prediction",
      label: "Plan",
      icon: Sprout,
      desktopGroup: "farm",
    },
    {
      href: "/support",
      label: "Support",
      icon: LifeBuoy,
      desktopGroup: "support",
      match: ["/support", "/assistant", "/disease-help", "/schemes"],
    },
    {
      href: "/markets",
      label: "Market",
      icon: ChartColumnBig,
      desktopGroup: "support",
    },
  ];

  if (role === "ADMIN") {
    items.push({
      href: "/admin",
      label: "Admin",
      icon: Settings2,
      desktopGroup: "support",
    });
  }

  return items;
}
