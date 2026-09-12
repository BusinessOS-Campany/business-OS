"use client";
import { useState, useEffect } from "react";
import { Star, Trash2, Reply, Check, X, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

export default function ReviewsPage() {
  const { t, locale } = useI18n();
  const [reviews, setReviews] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [editReply, setEditReply] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchReviews = () => {
    fetch("/api/admin/reviews").then(r => r.json()).then(setReviews).catch(() => {});
  };

  useEffect(() => { fetchReviews(); }, []);

  async function del(id: string) {
    await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    setReviews(reviews.filter((r) => r.id !== id));
  }

  function startEdit(r: any) {
    setEditId(r.id);
    setEditRating(r.rating);
    setEditComment(r.comment || "");
    setEditReply(r.reply || "");
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/reviews/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: editRating, comment: editComment, reply: editReply }),
      });
      if (res.ok) {
        setReviews((prev) => prev.map((r) => r.id === editId ? { ...r, rating: editRating, comment: editComment, reply: editReply } : r));
        setEditId(null);
      }
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin.reviews")}</h1>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr><th className="text-start p-3">{t("admin.product_name")}</th><th className="text-start p-3">{t("admin.review_user")}</th><th className="text-start p-3">{t("admin.review_rating")}</th><th className="text-start p-3">{t("admin.review_comment")}</th><th className="text-start p-3">{t("admin.review_reply")}</th><th className="text-start p-3">{t("admin.date")}</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-semibold">{locale === "ar" ? r.product?.name : (r.product?.nameEn || r.product?.name) || "—"}</td>
                <td className="p-3">{r.user?.name || r.user?.email || "—"}</td>
                <td className="p-3">
                  {editId === r.id ? (
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <button key={s} type="button" onClick={() => setEditRating(s)}>
                          <Star className={`h-4 w-4 ${s <= editRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />)}
                    </div>
                  )}
                </td>
                <td className="p-3 max-w-[200px]">
                  {editId === r.id ? (
                    <input type="text" value={editComment} onChange={(e) => setEditComment(e.target.value)} className="w-full rounded border border-border px-2 py-1 text-xs outline-none focus:border-primary bg-background" />
                  ) : (
                    <span className="text-muted-foreground">{r.comment || "—"}</span>
                  )}
                </td>
                <td className="p-3 max-w-[200px]">
                  {editId === r.id ? (
                    <input type="text" value={editReply} onChange={(e) => setEditReply(e.target.value)} placeholder={t("admin.review_reply")} className="w-full rounded border border-border px-2 py-1 text-xs outline-none focus:border-primary bg-background" />
                  ) : r.reply ? (
                    <div className="text-xs bg-muted p-2 rounded">
                      <span className="font-medium text-foreground">{t("admin.review_reply")}: </span>
                      <span className="text-muted-foreground">{r.reply}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {editId === r.id ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={saveEdit} loading={saving} disabled={saving}><Check className="h-4 w-4 text-green-500" /></Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit}><X className="h-4 w-4 text-red-500" /></Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => startEdit(r)}><Edit3 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {reviews.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">{t("admin.review_no_reviews")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
