"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn } from "@/components/motion-wrappers";
import { useI18n } from "@/lib/i18n/provider";
import { LocationPicker } from "@/components/shop/location-picker";

export default function CheckoutPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | undefined>();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    if (!cart.length) {
      setError(t("cart.empty"));
      setLoading(false);
      return;
    }
    const shippingAddress = JSON.stringify({
      city: form.get("city"),
      street: form.get("street"),
      notes: form.get("notes"),
      lat: location?.lat,
      lng: location?.lng,
    });
    const body = {
      customerName: form.get("name"),
      customerEmail: form.get("email"),
      customerPhone: form.get("phone"),
      shippingAddress,
      items: cart,
      couponCode: localStorage.getItem("appliedCoupon") || undefined,
    };
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        localStorage.removeItem("appliedCoupon");
        localStorage.setItem("lastOrderId", data.id);
        localStorage.setItem("lastOrder", JSON.stringify(data));
        localStorage.removeItem("cart");
        window.dispatchEvent(new CustomEvent("orderPlaced"));
        window.dispatchEvent(new CustomEvent("cartUpdated"));
        router.push(`/track/${data.id}`);
      } else {
        setError(data?.error || `${t("general.error")} ${res.status}`);
      }
    } catch {
      setError(t("general.error"));
    }
    setLoading(false);
  }

  return (
    <FadeIn>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <h1 className="text-2xl font-bold">{t("checkout.title")}</h1>
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold">{t("checkout.shipping")}</h2>
              <Input id="name" name="name" label={t("checkout.full_name")} required />
              <Input id="email" name="email" type="email" label={t("checkout.email")} required />
              <Input id="phone" name="phone" label={t("checkout.phone")} required />
              <div className="grid grid-cols-2 gap-4">
                <Input id="city" name="city" label={t("checkout.city")} required />
                <Input id="street" name="street" label={t("checkout.street")} required />
              </div>
              <Textarea id="notes" name="notes" label={t("checkout.notes")} />
              <LocationPicker value={location} onChange={setLocation} />
            </CardContent>
          </Card>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {t("checkout.confirm")}
            </Button>
          </motion.div>
        </motion.form>
      </div>
    </FadeIn>
  );
}
