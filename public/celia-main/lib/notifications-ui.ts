import {
  Banknote,
  Bell,
  Box,
  Copy,
  CreditCard,
  HardDrive,
  Percent,
  ShoppingCart,
  Truck,
  User,
  UserCog,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { Dictionary } from "@/lib/i18n/dictionaries";

export interface NotificationItem {
  id: string;
  type: string;
  action: string;
  messageKey: string;
  messageParams?: Record<string, string | number> | null;
  entityId?: string | null;
  actorName?: string | null;
  isRead: boolean;
  createdAt: string;
}

export const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  expense: Wallet,
  advance: CreditCard,
  product: Box,
  sale: ShoppingCart,
  employee: User,
  user: UserCog,
  balance: Banknote,
  hobani: Banknote,
  copyPrice: Percent,
  transfer: Copy,
  agent: Truck,
  nasShare: HardDrive,
  device: HardDrive,
  default: Bell,
};

export function interpolate(
  template: string,
  params?: Record<string, string | number> | null,
): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`{${key}}`, String(value)),
    template,
  );
}

export function notificationText(t: Dictionary, item: NotificationItem): string {
  const key = item.messageKey.startsWith("notifications.")
    ? item.messageKey.slice("notifications.".length)
    : item.messageKey;
  const template = (t.notifications as Record<string, string>)[key] ?? item.messageKey;
  return interpolate(template, item.messageParams);
}

export function formatRelativeTime(iso: string, locale: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const minutes = Math.round(Math.abs(diffMs) / 60000);
  if (minutes < 1) return rtf.format(0, "minute");
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(-days, "day");
  const months = Math.round(days / 30);
  if (months < 12) return rtf.format(-months, "month");
  return rtf.format(-Math.round(months / 12), "year");
}
