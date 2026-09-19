import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Store,
  Receipt,
  RotateCcw,
  HandCoins,
  Package,
  Layers,
  Boxes,
  ArrowLeftRight,
  Truck,
  ShoppingBag,
  FileText,
  Banknote,
  Users,
  FileBarChart,
  Settings,
  ShieldCheck,
  Bell,
  ShoppingCart,
  BookOpen,
  BookOpenText,
  ClipboardList,
} from "lucide-react";

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  permission?: string;
}

export interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: "nav.menu",
    items: [
      { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
      { href: "/pos", labelKey: "nav.pos", icon: ShoppingCart, permission: "sale.create" },
    ],
  },
  {
    titleKey: "nav.sales",
    items: [
      { href: "/sales", labelKey: "nav.sales", icon: Receipt, permission: "invoice.view" },
      { href: "/returns", labelKey: "nav.returns", icon: RotateCcw, permission: "sale.refund" },
      { href: "/credit", labelKey: "nav.credit", icon: HandCoins, permission: "credit.manage" },
    ],
  },
  {
    titleKey: "nav.products",
    items: [
      { href: "/products", labelKey: "nav.products", icon: Package, permission: "product.view" },
      { href: "/categories", labelKey: "nav.categories", icon: Layers, permission: "category.manage" },
      { href: "/inventory", labelKey: "nav.inventory", icon: Boxes, permission: "inventory.view" },
      { href: "/transfers", labelKey: "nav.transfers", icon: ArrowLeftRight, permission: "transfer.manage" },
    ],
  },
  {
    titleKey: "nav.purchases",
    items: [
      { href: "/purchases", labelKey: "nav.purchases", icon: Truck, permission: "purchase.manage" },
      { href: "/purchase-orders", labelKey: "nav.purchaseOrders", icon: FileText, permission: "purchase.manage" },
      { href: "/suppliers", labelKey: "nav.suppliers", icon: ShoppingBag, permission: "supplier.manage" },
    ],
  },
  {
    titleKey: "nav.menu",
    items: [
      { href: "/expenses", labelKey: "nav.expenses", icon: Banknote, permission: "expense.manage" },
      { href: "/registers", labelKey: "nav.registers", icon: Store, permission: "register.manage" },
      { href: "/customers", labelKey: "nav.customers", icon: Users, permission: "customer.manage" },
      { href: "/reports", labelKey: "nav.reports", icon: FileBarChart, permission: "report.view" },
      { href: "/audit", labelKey: "nav.audit", icon: ClipboardList, permission: "audit.view" },
    ],
  },
  {
    titleKey: "nav.accounting",
    items: [
      { href: "/chart-accounts", labelKey: "nav.chartAccounts", icon: BookOpen, permission: "accounting.manage" },
      { href: "/journal", labelKey: "nav.journal", icon: BookOpenText, permission: "accounting.manage" },
    ],
  },
  {
    titleKey: "nav.settings",
    items: [
      { href: "/notifications", labelKey: "nav.notifications", icon: Bell },
      { href: "/settings/users", labelKey: "nav.users", icon: ShieldCheck, permission: "user.manage" },
      { href: "/settings/branches", labelKey: "nav.branches", icon: Store, permission: "branch.manage" },
      { href: "/settings/warehouses", labelKey: "nav.warehouses", icon: Boxes, permission: "warehouse.manage" },
      { href: "/settings/roles", labelKey: "nav.roles", icon: ShieldCheck, permission: "user.manage" },
      { href: "/settings", labelKey: "nav.settings", icon: Settings, permission: "settings.manage" },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);