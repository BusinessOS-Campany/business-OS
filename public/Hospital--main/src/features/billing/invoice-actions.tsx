"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PrinterIcon, XIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { voidInvoiceAction } from "@/actions/billing";

export function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: string }) {
  const tb = useTranslations("billing");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const voidInvoice = () => {
    startTransition(async () => {
      const res = await voidInvoiceAction(invoiceId, null);
      if (res?.ok) {
        toast.success(tc("updated"));
        router.refresh();
      } else {
        toast.error(res?.error?.startsWith("billing.") ? tb(res.error) : tc("error"));
      }
    });
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
        <PrinterIcon className="size-3.5" />
        {tb("printInvoice")}
      </Button>
      {(status === "DRAFT" || status === "ISSUED") && (
        <Button variant="destructive" size="sm" className="gap-1.5" disabled={isPending} onClick={voidInvoice}>
          {isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <XIcon className="size-3.5" />}
          {tb("void")}
        </Button>
      )}
    </>
  );
}