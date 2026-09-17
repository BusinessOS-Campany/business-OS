"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BookOpenText } from "lucide-react";
import { createAccountAction } from "@/actions/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AccountOption = { id: string; code: string; nameAr: string; nameEn: string };

const TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;

type State = { ok: boolean; error?: string } | null;

export function AccountForm({ accounts, locale }: { accounts: AccountOption[]; locale: string }) {
  const t = useTranslations("accounting");
  const tc = useTranslations("common");
  const router = useRouter();
  const [type, setType] = useState("ASSET");
  const [parentId, setParentId] = useState("none");
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await createAccountAction(null, formData);
      if (res?.ok) {
        toast.success(tc("saved"));
        router.refresh();
        return { ok: true };
      }
      return { ok: false, error: res?.error };
    },
    null
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpenText className="size-4 text-primary" />
          {t("addAccount")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={(fd) => {
            fd.set("type", type);
            fd.set("parentId", parentId === "none" ? "" : parentId);
            formAction(fd);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("account")} *</Label>
              <Input name="code" required className="h-8 text-sm" placeholder="1-1000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("name")} *</Label>
            <Input name="nameAr" required className="h-8 text-sm" dir="rtl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("name")} (EN)</Label>
            <Input name="nameEn" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("balance")}</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="h-8 w-full text-sm">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} · {locale === "ar" ? a.nameAr : a.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="isActive" defaultChecked />
            {tc("activate")}
          </label>
          {state && !state.ok && (
            <p className="text-xs text-destructive">{state.error ? t(state.error) : tc("error")}</p>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? tc("saving") : tc("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}