"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInventoryItemAction } from "@/actions/pharmacy";
import { type ActionResult } from "@/lib/result";
import { toast } from "sonner";

const CATEGORIES = [
  "MEDICINE",
  "MEDICAL_SUPPLY",
  "LABORATORY_SUPPLY",
  "SURGICAL_SUPPLY",
  "OFFICE_SUPPLY",
  "CLEANING_SUPPLY",
  "EQUIPMENT",
  "OTHER",
] as const;

export function ItemForm({ locale }: { locale: string }) {
  const t = useTranslations("pharmacy");
  const tc = useTranslations("common");
  const router = useRouter();

  const [state, action, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    createInventoryItemAction,
    null
  );
  const [category, setCategory] = React.useState<string>("MEDICINE");

  React.useEffect(() => {
    if (state?.ok && state.data?.id) {
      toast.success(tc("saved"));
      router.push(`/pharmacy/medicines/${state.data.id}`);
      router.refresh();
    } else if (state && !state.ok) {
      toast.error(state.error?.startsWith("pharmacy.") ? t(state.error.replace("pharmacy.", "")) : tc("error"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router]);

  return (
    <form action={(fd) => { fd.set("category", category); action(fd); }} className="space-y-5">
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nameAr">{t("itemName")} (العربية)</Label>
            <Input id="nameAr" name="nameAr" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nameEn">{t("itemName")} (English)</Label>
            <Input id="nameEn" name="nameEn" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue>{t(`categories.${category}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="unit">{t("unit")}</Label>
            <Input id="unit" name="unit" placeholder="tablet / vial / box" defaultValue="unit" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="genericName">{t("genericName")}</Label>
            <Input id="genericName" name="genericName" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="manufacturer">{t("manufacturer")}</Label>
            <Input id="manufacturer" name="manufacturer" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="strength">{t("strength")}</Label>
            <Input id="strength" name="strength" placeholder="500mg / 2%…" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reorderLevel">{t("reorderLevel")}</Label>
            <Input id="reorderLevel" name="reorderLevel" type="number" min="0" defaultValue="10" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="price">{t("price")} (YER)</Label>
            <Input id="price" name="price" type="number" min="0" step="0.01" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={pending} className="gap-2">
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          {pending ? tc("saving") : tc("create")}
        </Button>
      </div>
    </form>
  );
}