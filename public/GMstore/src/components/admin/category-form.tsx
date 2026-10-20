"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

interface Props {
  category?: { id: string; name: string; nameEn?: string | null; slug: string; description?: string | null; image?: string | null };
}

export function CategoryForm({ category }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();
  const [image, setImage] = useState<string | null>(category?.image || null);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const body = { name: form.get("name"), nameEn: form.get("nameEn"), slug: form.get("slug"), description: form.get("description"), image };
    const url = category ? `/api/categories/${category.id}` : "/api/categories";
    const method = category ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    router.push("/admin/categories");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <Input id="name" name="name" label={t("admin.category_name_ar")} defaultValue={category?.name} required />
      <Input id="nameEn" name="nameEn" label="Category Name (English)" defaultValue={category?.nameEn ?? ""} />
      <Input id="slug" name="slug" label={t("admin.slug")} defaultValue={category?.slug} required />
      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">{t("admin.category_image")}</label>
        <input type="file" accept="image/*" onChange={handleImage} className="block w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90" />
        {image && <div className="mt-2 relative inline-block"><img src={image} alt="" className="h-20 w-20 rounded-lg object-cover border border-border" /><button type="button" onClick={() => setImage(null)} className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] text-white hover:bg-red-600 shadow-sm" title={t("admin.delete_image")}>&times;</button></div>}
      </div>
      <div className="flex gap-3">
        <Button type="submit" loading={loading}>{category ? t("admin.update") : t("admin.add")}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>{t("admin.cancel")}</Button>
      </div>
    </form>
  );
}
