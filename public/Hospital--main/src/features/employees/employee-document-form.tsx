"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderPlus } from "lucide-react";
import { addEmployeeDocumentAction } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type State = { ok: boolean; error?: string } | null;

export function EmployeeDocumentForm({ employeeId }: { employeeId: string }) {
  const t = useTranslations();
  const tc = useTranslations("common");
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_: State, formData: FormData) => {
      const res = await addEmployeeDocumentAction(null, formData);
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
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="employeeId" value={employeeId} />
      <div className="space-y-1.5">
        <Label className="text-xs">Title *</Label>
        <Input name="title" required className="h-8 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{tc("name")}</Label>
          <Input name="fileName" className="h-8 text-sm" dir="ltr" placeholder="file.pdf" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">URL *</Label>
          <Input name="url" required className="h-8 text-sm" dir="ltr" placeholder="https://…" />
        </div>
      </div>
      {state && !state.ok && (
        <p className="text-xs text-destructive">{state.error ? t(state.error) : tc("error")}</p>
      )}
      <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
        <FolderPlus className="size-4" />
        {isPending ? tc("saving") : tc("add")}
      </Button>
    </form>
  );
}