import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "../../../src/lib/theme";
import { useI18n } from "../../../src/lib/i18n";
import { api } from "../../../src/lib/api";
import { Card } from "../../../src/components/ui/Card";
import { Badge } from "../../../src/components/ui/Badge";
import { Button } from "../../../src/components/ui/Button";

const statusBadge = { PENDING: "warning", PROCESSING: "warning", SHIPPED: "success", DELIVERED: "success", CANCELLED: "danger" };
const statusLabels = { PENDING: "قيد الانتظار", PROCESSING: "قيد المعالجة", SHIPPED: "تم الشحن", DELIVERED: "تم التوصيل", CANCELLED: "ملغي" };
const itemStatusBadge = { PENDING: "warning", CONFIRMED: "warning", SHIPPED: "success", DELIVERED: "success", CANCELLED: "danger" };
const itemStatusLabels = { PENDING: "قيد الانتظار", CONFIRMED: "مؤكد", SHIPPED: "تم الشحن", DELIVERED: "تم التوصيل", CANCELLED: "ملغي" };

const nextStatus = { PENDING: "PROCESSING", PROCESSING: "SHIPPED", SHIPPED: "DELIVERED" };
const nextLabel = { PENDING: "معالجة", PROCESSING: "شحن", SHIPPED: "توصيل" };

export default function AdminOrderDetailPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchOrder = () => api(`/orders/${id}`).then(setOrder);

  useEffect(() => { fetchOrder(); }, [id]);

  const handleStatusUpdate = async (status) => {
    setUpdating(true);
    try {
      await api(`/orders/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
      fetchOrder();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setUpdating(false);
    }
  };

  if (!order) return <ActivityIndicator style={{ marginTop: 100 }} size="large" color={theme.primary} />;

  const next = nextStatus[order.status];

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={[styles.title, { color: theme.foreground }]}>طلب #{order.id?.slice(0, 8)}</Text>

      <Card style={{ marginBottom: 12 }}>
        <View style={{ padding: 16, gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.mutedForeground }}>{t("orders.status")}</Text>
            <Badge label={statusLabels[order.status]} variant={statusBadge[order.status]} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.mutedForeground }}>{t("common.date")}</Text>
            <Text style={{ color: theme.foreground }}>{new Date(order.createdAt).toLocaleDateString("en-CA")}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.mutedForeground }}>{t("orders.customer")}</Text>
            <Text style={{ color: theme.foreground }}>{order.customerName || order.user?.name || "—"}</Text>
          </View>
          {order.phone && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: theme.mutedForeground }}>{t("orders.phone")}</Text>
              <Text style={{ color: theme.foreground }}>{order.phone}</Text>
            </View>
          )}
          {order.address && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: theme.mutedForeground }}>{t("orders.address")}</Text>
              <Text style={{ color: theme.foreground, flex: 1, textAlign: "right" }}>{order.address}</Text>
            </View>
          )}
        </View>
      </Card>

      {next && (
        <Button onPress={() => handleStatusUpdate(next)} loading={updating} style={{ marginBottom: 12 }}>
          {nextLabel[next]} ← {statusLabels[order.status]}
        </Button>
      )}

      <Text style={{ fontSize: 16, fontWeight: "600", color: theme.foreground, marginBottom: 8 }}>{t("orders.items")}</Text>
      {order.items?.map((item) => (
        <Card key={item.id} style={{ marginBottom: 8 }}>
          <View style={{ padding: 12, gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: theme.foreground, fontWeight: "500", flex: 1 }}>{item.product?.name || item.productName || "—"}</Text>
              {item.status && <Badge label={itemStatusLabels[item.status] || item.status} variant={itemStatusBadge[item.status] || "default"} />}
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {item.quantity && <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>x{item.quantity}</Text>}
              <Text style={{ color: theme.primary, fontWeight: "600" }}>{Number(item.price || item.product?.price || 0).toFixed(2)} ريال</Text>
            </View>
            {item.color && <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>اللون: {item.color}</Text>}
            {item.size && <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>المقاس: {item.size}</Text>}
            {item.product?.specs && typeof item.product.specs === "object" && Object.entries(item.product.specs).map(([k, v]) => (
              <Text key={k} style={{ color: theme.mutedForeground, fontSize: 11 }}>{k}: {String(v)}</Text>
            ))}
          </View>
        </Card>
      ))}

      <Card style={{ marginTop: 8 }}>
        <View style={{ padding: 16, gap: 6 }}>
          {order.subtotal > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: theme.mutedForeground }}>{t("orders.subtotal")}</Text>
              <Text style={{ color: theme.foreground }}>{Number(order.subtotal).toFixed(2)} ريال</Text>
            </View>
          )}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.mutedForeground }}>{t("orders.shipping")}</Text>
            <Text style={{ color: theme.foreground }}>{Number(order.shippingCost || 0).toFixed(2)} ريال</Text>
          </View>
          {order.discount > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: theme.mutedForeground }}>{t("orders.discount")}</Text>
              <Text style={{ color: "green" }}>-{Number(order.discount).toFixed(2)} ريال</Text>
            </View>
          )}
          <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: theme.foreground, fontWeight: "700" }}>{t("orders.total")}</Text>
            <Text style={{ color: theme.primary, fontWeight: "700" }}>{Number(order.total).toFixed(2)} ريال</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
});
