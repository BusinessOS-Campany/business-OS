"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Pencil, Trash2, Reply, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useI18n } from "@/lib/i18n/provider";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  createdAt: string;
  user: { id?: string; name: string | null };
}

export function ProductReviews({ productId, sessionUserId }: { productId: string; sessionUserId: string | undefined }) {
  const { t, locale } = useI18n();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReviews = () => {
    fetch(`/api/products/${productId}/reviews`).then(r => r.json()).then(setReviews).catch(() => {});
  };

  useEffect(() => { fetchReviews(); }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });
    const data = await res.json();
    if (res.ok) {
      setReviews([data, ...reviews]);
      setRating(0);
      setComment("");
    } else {
      setError(data.error);
    }
    setLoading(false);
  }

  async function handleEdit(reviewId: string) {
    const res = await fetch(`/api/products/${productId}/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: editRating, comment: editComment }),
    });
    if (res.ok) {
      const updated = await res.json();
      setReviews(reviews.map((r) => (r.id === reviewId ? updated : r)));
      setEditingId(null);
    }
  }

  async function handleDelete(reviewId: string) {
    setDeletingId(reviewId);
    await fetch(`/api/products/${productId}/reviews/${reviewId}`, { method: "DELETE" });
    setReviews(reviews.filter((r) => r.id !== reviewId));
    setDeletingId(null);
  }

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">{t("detail.reviews")}</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-1 text-sm">
            {StarRating(avgRating)}
            <span className="text-muted-foreground">({reviews.length})</span>
          </div>
        )}
      </div>

      {sessionUserId ? (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onClick={() => setRating(s)} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} className="transition-transform hover:scale-110">
                <Star className={`h-5 w-5 ${s <= (hoverRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea placeholder={t("detail.review_placeholder")} value={comment} onChange={(e) => setComment(e.target.value)} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" size="sm" loading={loading} disabled={!rating}>{t("detail.review_submit")}</Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">{t("detail.login_to_review")}</p>
      )}

      <AnimatePresence>
        <div className="space-y-3">
          {reviews.map((r) => {
            const isOwner = sessionUserId === r.user?.id;
            const isEditing = editingId === r.id;
            return (
              <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-lg border border-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{r.user.name || "—"}</span>
                      <div className="flex">{StarRating(isEditing ? editRating : r.rating)}</div>
                      <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button key={s} type="button" onClick={() => setEditRating(s)}>
                              <Star className={`h-5 w-5 ${s <= editRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                            </button>
                          ))}
                        </div>
                        <Textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleEdit(r.id)}><Check className="h-4 w-4 ml-1" />{t("general.save")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4 ml-1" />{t("general.cancel")}</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                        {r.reply && (
                          <div className="mt-2 rounded-lg bg-primary/5 p-3 text-sm border border-primary/10">
                            <p className="text-xs font-medium text-primary mb-0.5 flex items-center gap-1">
                              <Reply className="h-3 w-3" />{t("general.reply")}
                            </p>
                            <p className="text-sm">{r.reply}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {isOwner && !isEditing && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(r.id); setEditRating(r.rating); setEditComment(r.comment || ""); }}
                        className="p-1 text-muted-foreground hover:text-primary transition-colors"
                        title={t("general.edit")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        className="p-1 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                        title={t("general.delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          {reviews.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t("detail.no_reviews")}</p>}
        </div>
      </AnimatePresence>
    </div>
  );
}

function StarRating(rating: number) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-4 w-4 ${s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
      ))}
    </div>
  );
}
