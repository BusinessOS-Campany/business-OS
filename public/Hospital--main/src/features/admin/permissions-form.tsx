"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2Icon } from "lucide-react";
import { updateRolePermissionsAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type PermissionItem = {
  id: string;
  key: string;
  module: string;
  action: string;
};

export function PermissionsForm({
  roleId,
  permissions,
  selectedIds,
  isSystem,
}: {
  roleId: string;
  permissions: PermissionItem[];
  selectedIds: string[];
  isSystem: boolean;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set(selectedIds));
  const [pending, start] = React.useTransition();

  const grouped = React.useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    for (const p of permissions) {
      const arr = map.get(p.module) ?? [];
      arr.push(p);
      map.set(p.module, arr);
    }
    return Array.from(map.entries());
  }, [permissions]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModule = (items: PermissionItem[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of items) {
        if (checked) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  };

  const save = () => {
    start(async () => {
      const res = await updateRolePermissionsAction(roleId, Array.from(selected));
      if (res.ok) {
        toast.success(t("permissionsSaved"));
        router.refresh();
      } else {
        toast.error(tc("error"));
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{t("modulePermissions")}</CardTitle>
        {!isSystem && (
          <Button size="sm" className="gap-1.5" disabled={pending} onClick={save}>
            {pending ? <Loader2Icon className="size-4 animate-spin" /> : <Save className="size-4" />}
            {pending ? tc("saving") : t("savePermissions")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {grouped.length === 0 && <p className="text-sm text-muted-foreground">{tc("noResults")}</p>}
        {grouped.map(([module, items], idx) => {
          const allChecked = items.every((p) => selected.has(p.id));
          return (
            <div key={module} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center gap-2">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={(v) => toggleModule(items, v === true)}
                  disabled={isSystem}
                  id={`module-${idx}`}
                />
                <label htmlFor={`module-${idx}`} className="text-sm font-medium capitalize cursor-pointer">
                  {module}
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 text-xs">
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={() => toggle(p.id)}
                      disabled={isSystem}
                    />
                    <span className="capitalize">{p.action}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
