import { useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "../src/lib/i18n";
import { useCart } from "../src/lib/cart";
import { api, formatPrice, currencyLabel } from "../src/lib/api";
import { Button } from "../src/components/ui/Button";
import { Trash2, Plus, Minus, ShoppingBag, Truck } from "lucide-react-native";
import { reportScroll } from "../src/lib/scroll-state";
import { useTheme } from "../src/lib/theme";

export default function CartPage() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();
  const { items, removeFromCart, updateQuantity, subtotal, shippingCost, isFreeShipping, freeThreshold, applyCoupon } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const total = Math.max(0, subtotal - discount + (isFreeShipping ? 0 : shippingCost));

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    try {
      const res = await api(`/coupons/validate/${couponCode.trim()}`);
      if (res?.valid && res.discount) {
        const d = res.isPercentage ? Math.round(subtotal * res.discount / 100) : res.discount;
        setDiscount(Math.min(d, subtotal));
        setCouponMsg(t("cart.coupon_applied"));
        await applyCoupon(couponCode.trim());
      } else {
        setDiscount(0);
        setCouponMsg(t("cart.coupon_invalid"));
      }
    } catch {
      setDiscount(0);
      setCouponMsg(t("cart.coupon_invalid"));
    }
  }

  const progress = Math.min(100, (subtotal / freeThreshold) * 100);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.foreground, padding: 16, paddingBottom: 0 }}>{t("cart.drawer_title")}</Text>
      {items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16 }}>
          <ShoppingBag size={48} color={theme.border} />
          <Text style={{ fontSize: 16, color: theme.mutedForeground }}>{t("cart.empty")}</Text>
          <Button title={t("cart.continue_shopping")} onPress={() => router.push("/products")} variant="outline" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => `${item.productId}-${item.color}-${item.size}-${i}`}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          onScroll={(e) => reportScroll(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          ListHeaderComponent={
            <>
              <View style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 12, gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Truck size={18} color={isFreeShipping ? theme.success : theme.primary} />
                  <Text style={{ fontSize: 13, color: theme.cardForeground, flex: 1 }}>
                    {isFreeShipping ? t("cart.free_shipping_achieved") : `${t("cart.free_shipping_progress", { amount: `${formatPrice(freeThreshold - subtotal)} ${currencyLabel.yer}` })}`}
                  </Text>
                </View>
                <View style={{ height: 6, backgroundColor: theme.muted, borderRadius: 3, overflow: "hidden" }}>
                  <View style={{ width: `${progress}%`, height: 6, backgroundColor: isFreeShipping ? theme.success : theme.primary, borderRadius: 3 }} />
                </View>
              </View>
            </>
          }
          renderItem={({ item }) => (
            <View style={{ flexDirection: "row", backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 12, gap: 12 }}>
              <Image source={{ uri: item.image }} style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: theme.muted }} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: theme.cardForeground }}>{item.name}</Text>
                {item.color && <Text style={{ fontSize: 12, color: theme.mutedForeground }}>اللون: {item.color}</Text>}
                {item.size && <Text style={{ fontSize: 12, color: theme.mutedForeground }}>المقاس: {item.size}</Text>}
                <Text style={{ fontSize: 16, fontWeight: "700", color: theme.primary }}>{formatPrice(item.price * item.quantity)} {currencyLabel.yer}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: theme.border, borderRadius: 6 }}>
                    <TouchableOpacity onPress={() => updateQuantity(item.productId, item.color, -1)} style={{ padding: 6 }}><Minus size={14} color={theme.cardForeground} /></TouchableOpacity>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: theme.cardForeground, minWidth: 20, textAlign: "center" }}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => updateQuantity(item.productId, item.color, 1)} style={{ padding: 6 }}><Plus size={14} color={theme.cardForeground} /></TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeFromCart(item.productId, item.color)} style={{ padding: 6 }}>
                    <Trash2 size={16} color={theme.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListFooterComponent={
            <View style={{ gap: 12 }}>
              <View style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 12, gap: 8 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    value={couponCode}
                    onChangeText={setCouponCode}
                    placeholder={t("cart.coupon_placeholder")}
                    placeholderTextColor={theme.mutedForeground}
                    style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: theme.cardForeground }}
                  />
                  <Button title={t("cart.coupon_apply")} onPress={handleApplyCoupon} variant="outline" />
                </View>
                {couponMsg ? <Text style={{ color: discount > 0 ? theme.success : theme.destructive, fontSize: 12 }}>{couponMsg}</Text> : null}
              </View>
              <View style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>{t("cart.subtotal")}</Text>
                  <Text style={{ color: theme.cardForeground, fontWeight: "600", fontSize: 14 }}>{formatPrice(subtotal)} {currencyLabel.yer}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>{t("cart.shipping")}</Text>
                  <Text style={{ color: isFreeShipping ? theme.success : theme.cardForeground, fontWeight: "600", fontSize: 14 }}>
                    {isFreeShipping ? t("cart.free_shipping") : `${formatPrice(shippingCost)} ${currencyLabel.yer}`}
                  </Text>
                </View>
                {discount > 0 && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>{t("cart.coupon_discount")}</Text>
                    <Text style={{ color: theme.success, fontWeight: "600", fontSize: 14 }}>-{formatPrice(discount)} {currencyLabel.yer}</Text>
                  </View>
                )}
                <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: theme.cardForeground }}>{t("cart.total")}</Text>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: theme.primary }}>{formatPrice(total)} {currencyLabel.yer}</Text>
                </View>
                <Button title={t("cart.checkout")} onPress={() => router.push("/checkout")} style={{ marginTop: 8 }} />
              </View>
            </View>
          }
        />
      )}
    </View>
  );
}
