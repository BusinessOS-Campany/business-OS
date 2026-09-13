import {
  Banknote,
  Calendar,
  CalendarDays,
  CalendarRange,
  Circle,
  CircleOff,
  Clipboard,
  Coins,
  FolderMinus,
  FolderPlus,
  Gauge,
  LayoutDashboard,
  Layers,
  List,
  Network,
  Phone,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sunrise,
  Tags,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { PermissionKey } from "@/lib/users/permissions";

export interface SidebarLink {
  label: string;
  href?: string;
  icon?: LucideIcon;
  permission?: PermissionKey | PermissionKey[];
  children?: SidebarLink[];
}

export interface SidebarSection {
  heading?: string;
  links: SidebarLink[];
}

export function isLinkAllowed(link: SidebarLink, permissions: string[]): boolean {
  if (!link.permission) return true;
  const keys = Array.isArray(link.permission) ? link.permission : [link.permission];
  return keys.some((key) => permissions.includes(key));
}

export function filterLinks(links: SidebarLink[], permissions: string[]): SidebarLink[] {
  const filtered: SidebarLink[] = [];
  for (const link of links) {
    if (link.children && link.children.length > 0) {
      const children = filterLinks(link.children, permissions);
      if (link.href || children.length > 0) {
        filtered.push({ ...link, children });
      }
    } else if (isLinkAllowed(link, permissions)) {
      filtered.push(link);
    }
  }
  return filtered;
}

export function filterSections(
  sections: SidebarSection[],
  permissions: string[],
): SidebarSection[] {
  return sections
    .map((section) => ({ ...section, links: filterLinks(section.links, permissions) }))
    .filter((section) => section.links.length > 0);
}

export interface FlatPage {
  label: string;
  href: string;
  icon?: LucideIcon;
}

export function flattenPages(sections: SidebarSection[]): FlatPage[] {
  const pages: FlatPage[] = [];
  function walk(links: SidebarLink[]) {
    for (const link of links) {
      const children = link.children ?? [];
      if (link.href) {
        pages.push({ label: link.label, href: link.href, icon: link.icon });
      }
      walk(children);
    }
  }
  for (const section of sections) walk(section.links);
  return pages;
}

export function getSidebarSections(t: Dictionary): SidebarSection[] {
  const s = t.sidebar;
  return [
    {
      links: [
        {
          label: s.dashboard,
          icon: Gauge,
          children: [{ label: s.dashboard, href: "/", icon: LayoutDashboard, permission: "dashboard" }],
        },
        {
          label: s.transferSystem,
          icon: Clipboard,
          children: [
            { label: s.transfersDashboard, href: "/transfers", icon: LayoutDashboard },
            { label: s.transferHistory, href: "/transfers/history", icon: FolderPlus },
            { label: s.transferDevices, href: "/transfers/devices", icon: Layers },
            { label: s.transferSettings, href: "/transfers/settings", icon: ShieldCheck },
          ],
        },
        {
          label: s.income,
          icon: Coins,
          children: [
            { label: s.dailyIncome, href: "/dailyIncome", icon: CalendarDays, permission: "daily_income" },
            { label: s.weeklyIncome, href: "/weeklyIncome", icon: CalendarRange, permission: "weekly_income" },
            { label: s.monthlyIncome, href: "/monthlyIncome", icon: Calendar, permission: "monthly_income" },
          ],
        },
        {
          label: s.incomeTotals,
          icon: List,
          children: [
            { label: s.totalHobani, href: "/totalOfHobani", icon: Network, permission: "total_hobani_income" },
            { label: s.totalBalanceSales, href: "/totalOfbalence", icon: Phone, permission: "total_recharge" },
            { label: s.totalSales, href: "/totalOfSelles", icon: ShoppingCart, permission: "total_sales" },
            { label: s.shifts, href: "/shifts", icon: Sunrise, permission: ["morning_income", "evening_income"] },
          ],
        },
        {
          label: s.sales,
          icon: Banknote,
          children: [
            { label: s.viewAllSales, href: "/allProduct", icon: List, permission: "sold_products" },
          ],
        },
        {
          label: s.expenses,
          icon: Wallet,
          children: [
            { label: s.viewExpenses, href: "/showExpenses", icon: Layers, permission: "view_expenses" },
          ],
        },
        {
          label: s.advances,
          icon: CircleOff,
          children: [
            { label: s.viewAdvances, href: "/showAdvance", icon: FolderMinus, permission: "view_loans" },
          ],
        },
      ],
    },
    {
      heading: s.headingPricing,
      links: [
        {
          label: s.pricingSystem,
          icon: Tags,
          children: [
            { label: s.copyPrice, href: "/embedcopyPrice", icon: Receipt, permission: "set_copy_price" },
            {
              label: s.productPrices,
              icon: ShoppingBag,
              children: [
                { label: s.productPrices, href: "/embedProductPrice", icon: Circle, permission: "set_product_price" },
              ],
            },
          ],
        },
      ],
    },
    {
      heading: s.headingPermissions,
      links: [
        {
          label: s.employeePermissions,
          icon: Users,
          children: [
            { label: s.manageEmployees, href: "/employees", icon: UsersRound, permission: "manage_roles" },
            { label: s.manageUsers, href: "/users", icon: Circle, permission: "manage_roles" },
            {
              label: s.employeeSalaries,
              icon: Banknote,
              children: [
                { label: s.editSalaries, href: "/salaryPage", icon: Circle, permission: "manage_salaries" },
              ],
            },
          ],
        },
      ],
    },
  ];
}
