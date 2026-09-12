"use client";
import { useState, useEffect } from "react";
import { Star, MessageSquare, Flag, Reply, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/provider";

interface Review {
  id: string;
  rating: number;
  comment: string;
  reply: string | null;
  reported: boolean;
  createdAt: string;
  user: { name: string; email: string };
  product: { name: string; nameEn: string | null; images: string[] };
}

export default function MerchantReviewsPage() {
  const { t, locale, direction } = useI18n();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<Record<string, boolean>>({});
  const [reporting, setReporting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/merchant/reviews")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => {
        setReviews(data.reviews || data || []);
        setLoading(false);
      })
      .catch(() => {
        setMessage({ type: "error", text: t("merchant.load_error") });
        setLoading(false);
      });
  }, [t]);

  const handleReply = async (reviewId: string) => {
    const reply = replyTexts[reviewId]?.trim();
    if (!reply) return;
    setReplying((prev) => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch(`/api/merchant/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply }),
      });
      if (!res.ok) throw new Error("Failed");
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, reply } : r))
      );
      setReplyTexts((prev) => {
        const next = { ...prev };
        delete next[reviewId];
        return next;
      });
    } catch {
      setMessage({ type: "error", text: t("merchant.reply_error") });
    } finally {
      setReplying((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleReport = async (reviewId: string) => {
    setReporting((prev) => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch(`/api/merchant/reviews/${reviewId}/report`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, reported: true } : r))
      );
    } catch {
      setMessage({ type: "error", text: t("merchant.report_error") });
    } finally {
      setReporting((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`}
      />
    ));
  };

  if (loading) {
    return (
      <div dir={direction} className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-24 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div dir={direction} className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          {t("merchant.reviews")}
        </h1>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-40" />
            <p>{t("merchant.no_reviews")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="h-14 w-14 rounded-lg border border-border bg-muted overflow-hidden flex-shrink-0">
                    {review.product.images?.[0] ? (
                      <img
                        src={review.product.images[0]}
                        alt={review.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <MessageSquare className="h-6 w-6 m-auto text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">
                          {locale === "ar" ? review.product.name : (review.product.nameEn || review.product.name)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {review.user.name} &middot; {review.user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {review.reported && (
                          <Badge variant="danger">{t("merchant.reported")}</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 mt-2">
                      {renderStars(review.rating)}
                    </div>

                    <p className="text-sm mt-2">{review.comment}</p>

                    {review.reply ? (
                      <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {t("merchant.your_reply")}:
                        </p>
                        <p>{review.reply}</p>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          placeholder={t("merchant.reply_placeholder")}
                          value={replyTexts[review.id] || ""}
                          onChange={(e) =>
                            setReplyTexts((prev) => ({ ...prev, [review.id]: e.target.value }))
                          }
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleReply(review.id)}
                            loading={replying[review.id]}
                            disabled={replying[review.id] || !replyTexts[review.id]?.trim()}
                          >
                            <Reply className="h-4 w-4 ms-1" />
                            {t("merchant.reply")}
                          </Button>
                          {!review.reported && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReport(review.id)}
                              loading={reporting[review.id]}
                              disabled={reporting[review.id]}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Flag className="h-4 w-4 ms-1" />
                              {t("merchant.report")}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
