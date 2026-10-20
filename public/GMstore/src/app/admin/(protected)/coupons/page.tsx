"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export default function CouponsPage() {
  const { t } = useI18n();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [form, setForm] = useState({ code: "", discount: "", maxUses: "", minAmount: "", expiresAt: "", active: true });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetch("/api/coupons").then(r => r.json()).then(setCoupons).catch(() => {}); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      setShowForm(false);
      setForm({ code: "", discount: "", maxUses: "", minAmount: "", expiresAt: "", active: true });
      const refreshed = await fetch("/api/coupons").then(r => r.json());
      setCoupons(refreshed);
    }
  }

  async function toggleActive(c: any) {
    await fetch(`/api/coupons/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !c.active }) });
    setCoupons(coupons.map((x) => x.id === c.id ? { ...x, active: !x.active } : x));
  }

  async function del(id: string) {
    await fetch(`/api/coupons/${id}`, { method: "DELETE" });
    setCoupons(coupons.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin.coupons")}</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 ml-1" />{t("admin.add_coupon")}</Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <input placeholder={t("admin.coupon_code_placeholder")} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="rounded-lg border border-border px-3 py-2 text-sm bg-background" required />
            <input placeholder={t("admin.discount")} type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="rounded-lg border border-border px-3 py-2 text-sm bg-background" required />
            <input placeholder={t("admin.max_uses")} type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} className="rounded-lg border border-border px-3 py-2 text-sm bg-background" />
            <input placeholder={t("admin.min_amount")} type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} className="rounded-lg border border-border px-3 py-2 text-sm bg-background" />
            <input placeholder={t("admin.expiry_date")} type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="rounded-lg border border-border px-3 py-2 text-sm bg-background" />
          </div>
          <Button type="submit">{t("admin.save")}</Button>
        </form>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr><th className="text-start p-3">{t("admin.code")}</th><th className="text-start p-3">{t("admin.discount")}</th><th className="text-start p-3">{t("admin.usage")}</th><th className="text-start p-3">{t("admin.expiry_date")}</th><th className="text-start p-3">{t("admin.status")}</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-semibold">{c.code}</td>
                <td className="p-3">{c.discount}%</td>
                <td className="p-3">{c.usedCount}/{c.maxUses || "∞"}</td>
                <td className="p-3">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—"}</td>
                <td className="p-3">
                  <button onClick={() => toggleActive(c)} className={`px-2 py-0.5 rounded text-xs font-semibold ${c.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{c.active ? t("admin.active_status") : t("admin.inactive_status")}</button>
                </td>
                <td className="p-3">
                  <button onClick={() => del(c.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{t("admin.no_coupons")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
