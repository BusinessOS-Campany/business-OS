"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserPlus, Loader2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createUserAction } from "@/actions/admin";
import { type ActionResult } from "@/lib/result";
import { toast } from "sonner";

export type Option = { id: string; nameAr: string; nameEn: string };

export function UserForm({
  roles,
  branches,
  employees,
  locale,
}: {
  roles: (Option & { key: string })[];
  branches: Option[];
  employees: (Option & { employeeNo: string })[];
  locale: string;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const ta = useTranslations("auth");
  const ts = useTranslations("settings");
  const router = useRouter();

  const [roleId, setRoleId] = React.useState(roles[0]?.id ?? "");
  const [branchId, setBranchId] = React.useState("none");
  const [employeeId, setEmployeeId] = React.useState("none");

  const [state, action, pending] = useActionState(
    async (_: ActionResult | null, formData: FormData) => createUserAction(null, formData),
    null
  );

  React.useEffect(() => {
    if (state?.ok) {
      toast.success(tc("created"));
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(tc("error"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  const submit = (formData: FormData) => {
    formData.set("roleId", roleId);
    formData.set("branchId", branchId === "none" ? "" : branchId);
    formData.set("employeeId", employeeId === "none" ? "" : employeeId);
    action(formData);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="size-4 text-primary" />
          {t("newUser")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("email")} *</Label>
            <Input name="email" type="email" required className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{ta("email")}</Label>
            <Input name="username" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("password")} *</Label>
            <Input name="password" type="password" required minLength={6} className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("phone")}</Label>
            <Input name="phone" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("name")} (EN)</Label>
            <Input name="nameEn" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{tc("name")} (AR)</Label>
            <Input name="nameAr" dir="rtl" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("role")} *</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger className="h-8 w-full text-sm">
                <SelectValue placeholder={t("role")} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {locale === "ar" ? r.nameAr : r.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{ts("branchesSettings")}</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="h-8 w-full text-sm">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {locale === "ar" ? b.nameAr : b.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">{t("linkedEmployee")}</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-8 w-full text-sm">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.employeeNo} · {locale === "ar" ? e.nameAr : e.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {state && !state.ok && (
            <p className="text-xs text-destructive sm:col-span-2">{tc("error")}</p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" className="gap-1.5" disabled={pending || !roleId}>
              {pending ? <Loader2Icon className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              {pending ? tc("saving") : t("newUser")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
