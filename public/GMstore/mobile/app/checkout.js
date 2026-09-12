import { useState, useEffect } from "react";
import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useI18n } from "../src/lib/i18n";
import { useCart } from "../src/lib/cart";
import { api, formatPrice, currencyLabel } from "../src/lib/api";
import { Button } from "../src/components/ui/Button";
import { MapPin } from "lucide-react-native";
import { reportScroll } from "../src/lib/scroll-state";
import { useTheme } from "../src/lib/theme";

export default function CheckoutPage() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();
  const { items, setItems, setLastOrder, subtotal, shippingCost, isFreeShipping } = useCart();
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "", street: "", notes: "" });

  useEffect(() => {
    AsyncStorage.getItem("appliedCoupon").then((c) => {
      if (c) setCouponCode(c);
    });
  }, []);

  async function handleSubmit() {
    if (!form.name || !form.email || !form.phone || !form.city || !form.street) {
      Alert.alert("", t("common.fill_required"));
      return;
    }
    setLoading(true);
    try {
      const res = await api("/checkout", {
        method: "POST",
        body: JSON.stringify({
          customerName: form.name,
          customerEmail: form.email,
          customerPhone: form.phone,
          shippingAddress: JSON.stringify({ city: form.city, street: form.street, notes: form.notes }),
          items,
          couponCode: couponCode || undefined,
        }),
      });
      await AsyncStorage.removeItem("appliedCoupon");
      setItems([]);
      setLastOrder(res);
      router.push(`/track/${res.id}`);
    } catch (e) {
      Alert.alert("", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}
      onScroll={(e) => reportScroll(e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={16}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.foreground, padding: 16, paddingBottom: 0 }}>{t("checkout.title")}</Text>
      <View style={{ padding: 16, gap: 16 }}>
        <View style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MapPin size={18} color={theme.primary} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: theme.cardForeground }}>{t("checkout.shipping_info")}</Text>
          </View>
          {[{ key: "name", label: t("checkout.full_name"), type: "default" },
            { key: "email", label: t("checkout.email"), type: "email-address" },
            { key: "phone", label: t("checkout.phone"), type: "phone-pad" },
            { key: "city", label: t("checkout.city"), type: "default" },
            { key: "street", label: t("checkout.street"), type: "default" },
          ].map((field) => (
            <View key={field.key}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: theme.cardForeground, marginBottom: 4 }}>{field.label}</Text>
              <TextInput
                value={form[field.key]}
                onChangeText={(v) => setForm({ ...form, [field.key]: v })}
                keyboardType={field.type}
                style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.cardForeground }}
              />
            </View>
          ))}
          <View>
            <Text style={{ fontSize: 13, fontWeight: "500", color: theme.cardForeground, marginBottom: 4 }}>{t("checkout.notes")}</Text>
            <TextInput
              value={form.notes}
              onChangeText={(v) => setForm({ ...form, notes: v })}
              multiline
              numberOfLines={3}
              style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.cardForeground, minHeight: 72 }}
            />
          </View>
        </View>
        <View style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: theme.cardForeground }}>{t("checkout.summary")}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.mutedForeground }}>{t("cart.subtotal")}</Text>
            <Text style={{ color: theme.cardForeground, fontWeight: "600" }}>{formatPrice(subtotal)} {currencyLabel.yer}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.mutedForeground }}>{t("cart.shipping")}</Text>
            <Text style={{ color: isFreeShipping ? theme.success : theme.cardForeground }}>{isFreeShipping ? t("cart.free_shipping") : `${formatPrice(shippingCost)} ${currencyLabel.yer}`}</Text>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.cardForeground }}>{t("cart.total")}</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.primary }}>{formatPrice(subtotal + (isFreeShipping ? 0 : shippingCost))} {currencyLabel.yer}</Text>
          </View>
        </View>
        <Button onPress={handleSubmit} loading={loading}>{t("checkout.confirm")}</Button>
      </View>
    </ScrollView>
  );
}
