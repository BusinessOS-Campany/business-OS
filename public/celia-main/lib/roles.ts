import type { Dictionary } from "@/lib/i18n/dictionaries";

export function roleLabel(role: string, t: Dictionary): string {
  return t.roles[role as keyof Dictionary["roles"]] ?? role;
}
