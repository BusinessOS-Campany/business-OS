"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useI18n } from "@/lib/i18n/provider";

export function DeleteProductButton({ productId, redirectTo }: { productId: string; redirectTo?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("admin.delete_failed"));
      }
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
      setOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : t("admin.delete_failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>{t("admin.delete")}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("admin.confirm_delete_title")}>
        <p className="mb-4 text-sm text-muted-foreground">{t("admin.confirm_delete_product")}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>{t("admin.cancel")}</Button>
          <Button variant="danger" loading={loading} onClick={handleDelete}>{t("admin.delete")}</Button>
        </div>
      </Modal>
    </>
  );
}
