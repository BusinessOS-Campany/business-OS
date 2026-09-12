import { useEffect, useState } from "react";
import { View, Text, ScrollView, Image, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useI18n } from "../../src/lib/i18n";
import { useTheme } from "../../src/lib/theme";
import { api, formatPrice, currencyLabel } from "../../src/lib/api";
import { Button } from "../../src/components/ui/Button";
import { Badge } from "../../src/components/ui/Badge";
import { Package, Calendar, Search } from "lucide-react-native";
import { reportScroll } from "../../src/lib/scroll-state";

const statusSteps = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"];
const statusBadgeVariant = { PENDING: "warning", PROCESSING: "warning", SHIPPED: "success", DELIVERED: "success", CANCELLED: "danger" };
const statusLabels = { PENDING: "قيد الانتظار", PROCESSING: "قيد المعالجة", SHIPPED: "تم الشحن", DELIVERED: "تم التوصيل", CANCELLED: "ملغي" };

export default function TrackOrderPage() {
  const { id } = useLocalSearchParams();
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState(id || "");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (id) {
      api(`/orders/${id}`).then((data) => {
        setOrder(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id]);

  async function handleSearch() {
    if (!searchId.trim()) return;
    setSearching(true);
    try {
      const data = await api(`/orders/${searchId.trim()}`);
      setOrder(data);
    } catch {
      setOrder(null);
    }
    setSearching(false);
  }

  if (!id && !order) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ alignItems: "center", padding: 40, gap: 12 }}>
          <Package size={48} color={theme.primary} />
          <Text style={{ fontSize: 20, fontWeight: "700", color: theme.foreground }}>{t("track.title")}</Text>
        </View>
        <View style={{ padding: 16, gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: theme.foreground }}>{t("track.order_id")}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={searchId}
              onChangeText={setSearchId}
              placeholder="أدخل رقم الطلب"
              placeholderTextColor={theme.mutedForeground}
              style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: theme.foreground, fontFamily: "monospace" }}
            />
            <Button onPress={handleSearch} loading={searching}><Search size={18} color={theme.primaryForeground} /></Button>
          </View>
        </View>
      </View>
    );
  }

  if (loading || searching) return <ActivityIndicator style={{ marginTop: 100 }} size="large" color={theme.primary} />;
  if (!order) return <Text style={{ textAlign: "center", marginTop: 100, color: theme.mutedForeground }}>{t("track.not_found")}</Text>;

  const isCancelled = order.status === "CANCELLED";
  const currentStep = statusSteps.indexOf(order.status);
  let address = {};
  try { address = JSON.parse(order.shippingAddress || "{}"); } catch { address = { address: order.shippingAddress || "" }; }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}
      onScroll={(e) => reportScroll(e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={16}>
      <View style={{ alignItems: "center", padding: 24, gap: 8 }}>
        <Package size={40} color={theme.primary} />
        <Text style={{ fontSize: 20, fontWeight: "700", color: theme.foreground }}>{t("track.title")}</Text>
        <Text style={{ fontSize: 12, fontFamily: "monospace", color: theme.mutedForeground }}>{order.id}</Text>
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        {!isCancelled && (
          <View style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.cardForeground, marginBottom: 8 }}>حالة الطلب</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              {statusSteps.map((step, i) => (
                <View key={step} style={{ alignItems: "center", flex: 1 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: i <= currentStep ? theme.primary : theme.border, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: theme.primaryForeground, fontSize: 12, fontWeight: "700" }}>{i + 1}</Text>
                  </View>
                  {i < statusSteps.length - 1 && (
                    <View style={{ height: 3, backgroundColor: i < currentStep ? theme.primary : theme.border, flex: 1, marginHorizontal: 4, marginTop: -16 }} />
                  )}
                </View>
              ))}
            </View>
            <Text style={{ textAlign: "center", fontSize: 13, color: theme.primary, fontWeight: "600", marginTop: 8 }}>{statusLabels[order.status]}</Text>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 12, gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.cardForeground, marginBottom: 4 }}>{t("track.customer")}</Text>
            <Text style={{ fontSize: 13, color: theme.cardForeground }}>{order.customerName}</Text>
            <Text style={{ fontSize: 12, color: theme.mutedForeground }}>{order.customerEmail}</Text>
            <Text style={{ fontSize: 12, color: theme.mutedForeground }}>{order.customerPhone}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 12, gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.cardForeground, marginBottom: 4 }}>{t("track.shipping_address")}</Text>
            <Text style={{ fontSize: 13, color: theme.mutedForeground }}>{address.city}{address.street ? `، ${address.street}` : ""}</Text>
            {address.notes && <Text style={{ fontSize: 12, color: theme.mutedForeground }}>{address.notes}</Text>}
          </View>
        </View>

        {order.items?.map((item) => (
          <View key={item.id} style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {item.product?.images?.[0] && (
                <Image source={{ uri: item.product.images[0] }} style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: theme.muted }} />
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: theme.cardForeground }}>
                  {locale === "en" && item.product?.nameEn ? item.product.nameEn : item.product?.name}
                </Text>
                <Text style={{ fontSize: 12, color: theme.mutedForeground }}>{t("track.quantity")}: {item.quantity} × {formatPrice(Number(item.price))} {currencyLabel.yer}</Text>
                {item.color && <Text style={{ fontSize: 12, color: theme.mutedForeground }}>اللون: {item.color}</Text>}
                {item.size && <Text style={{ fontSize: 12, color: theme.mutedForeground }}>المقاس: {item.size}</Text>}
              </View>
              <Badge label={statusLabels[item.status]} variant={statusBadgeVariant[item.status]} />
            </View>
          </View>
        ))}

        <View style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>{t("cart.subtotal")}</Text>
            <Text style={{ color: theme.cardForeground, fontWeight: "600" }}>{formatPrice(Number(order.subtotal || order.total))} {currencyLabel.yer}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>{t("cart.shipping")}</Text>
            <Text style={{ color: Number(order.shippingCost) === 0 ? theme.success : theme.cardForeground }}>
              {Number(order.shippingCost) === 0 ? t("cart.free_shipping") : `${formatPrice(Number(order.shippingCost))} ${currencyLabel.yer}`}
            </Text>
          </View>
          {Number(order.discount) > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>{t("cart.coupon_discount")}</Text>
              <Text style={{ color: theme.success }}>-{formatPrice(Number(order.discount))} {currencyLabel.yer}</Text>
            </View>
          )}
          <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.cardForeground }}>{t("track.total")}</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.primary }}>{formatPrice(Number(order.total))} {currencyLabel.yer}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, marginTop: 4 }}>
            <Calendar size={14} color={theme.mutedForeground} />
            <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{new Date(order.createdAt).toLocaleDateString("ar-SA")}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
