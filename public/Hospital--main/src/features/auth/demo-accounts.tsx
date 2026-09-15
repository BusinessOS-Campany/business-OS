"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ShieldCheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  { key: "demo", identifier: "demo", email: "demo@yemencare.local", password: "demo123", color: "bg-primary/15 text-primary" },
  { key: "admin", identifier: "admin@yemencare.local", email: "admin@yemencare.local", password: "Admin@123", color: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
  { key: "doctor", identifier: "doctor@yemencare.local", email: "doctor@yemencare.local", password: "Doctor@123", color: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  { key: "nurse", identifier: "nurse@yemencare.local", email: "nurse@yemencare.local", password: "Nurse@123", color: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  { key: "receptionist", identifier: "reception@yemencare.local", email: "reception@yemencare.local", password: "Reception@123", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { key: "pharmacist", identifier: "pharmacist@yemencare.local", email: "pharmacist@yemencare.local", password: "Pharmacy@123", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  { key: "laboratory", identifier: "lab@yemencare.local", email: "lab@yemencare.local", password: "Lab@123", color: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  { key: "accountant", identifier: "accountant@yemencare.local", email: "accountant@yemencare.local", password: "Account@123", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" },
] as const;

const ROLE_KEY_MAP: Record<string, string> = {
  demo: "demo",
  admin: "admin",
  doctor: "doctor",
  nurse: "nurse",
  receptionist: "receptionist",
  pharmacist: "pharmacist",
  laboratory: "laboratory",
  accountant: "accountant",
};

export function DemoAccounts() {
  const t = useTranslations("auth");
  const [filled, setFilled] = useState<number | null>(null);

  const fill = (identifier: string, password: string, idx: number) => {
    const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]');
    const passInput = document.querySelector<HTMLInputElement>('input[name="password"]');
    if (emailInput && passInput) {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      setter?.call(emailInput, identifier);
      setter?.call(passInput, password);
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
      passInput.dispatchEvent(new Event("input", { bubbles: true }));
      setFilled(idx);
    }
  };

  return (
    <div className="rounded-lg border bg-card/60 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <ShieldCheckIcon className="size-3.5" />
        {t("demoAccounts")}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DEMO_ACCOUNTS.map((acc, i) => (
          <button
            key={acc.identifier}
            type="button"
            onClick={() => fill(acc.identifier, acc.password, i)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all hover:scale-[1.03] active:scale-95",
              acc.color,
              filled === i && "ring-2 ring-primary/50"
            )}
          >
            {t(ROLE_KEY_MAP[acc.key])}
          </button>
        ))}
      </div>
    </div>
  );
}