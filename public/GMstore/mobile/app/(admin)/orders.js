import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/lib/theme";
import { useI18n } from "../../src/lib/i18n";
import { api } from "../../src/lib/api";
import { Card } from "../../src/components/ui/Card";
import { Badge } from "../../src/components/ui/Badge";

const statusBadge = { PENDING: "warning", PROCESSING: "warning", SHIPPED: "success", DELIVERED: "success", CANCELLED: "danger" };
const statusLabels = { PENDING: "قيد الانتظار", PROCESSING: "قيد المعالجة", SHIPPED: "تم الشحن", DELIVERED: "تم التوصيل", CANCELLED: "ملغي" };

const tabs = [
  { key: "current", label: "Current", query: "PENDING,PROCESSING,SHIPPED" },
  { key: "delivered", label: "Delivered", query: "DELIVERED" },
];

export default function AdminOrdersPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("current");

  useEffect(() => {
    setOrders([]);
    setPage(1);
    setLoading(true);
    const q = tabs.find((t) => t.key === tab)?.query || "";
    api(`/orders/all?status=${q}&page=1`).then((data) => {
      setOrders(data || []);
      setLoading(false);
    });
  }, [tab]);

  useEffect(() => {
    if (page === 1) return;
    const q = tabs.find((t) => t.key === tab)?.query || "";
    api(`/orders/all?status=${q}&page=${page}`).then((data) => {
      setOrders((prev) => [...prev, ...(data || [])]);
    });
  }, [page]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={[styles.title, { color: theme.foreground }]}>{t("admin.orders")}</Text>

      <View style={{ flexDirection: "row", marginBottom: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={{ flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: tab === t.key ? theme.primary : "transparent" }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: tab === t.key ? theme.primaryForeground : theme.foreground }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push({ pathname: "/(admin)/orders/[id]", params: { id: item.id } })}>
            <Card style={{ marginBottom: 8 }}>
              <View style={{ padding: 12, gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: "monospace", fontSize: 11, color: theme.mutedForeground }}>#{item.id?.slice(0, 8)}</Text>
                  <Badge label={statusLabels[item.status]} variant={statusBadge[item.status]} />
                </View>
                <Text style={{ color: theme.foreground, fontWeight: "500" }}>{item.customerName || item.user?.name || "—"}</Text>
                <Text style={{ color: theme.primary, fontWeight: "700" }}>{Number(item.total).toFixed(2)} ريال</Text>
                <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>{new Date(item.createdAt).toLocaleDateString("en-CA")}</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={loading ? <ActivityIndicator /> : <Text style={{ textAlign: "center", color: theme.mutedForeground }}>{t("common.no_data")}</Text>}
        onEndReached={() => setPage((p) => p + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
});
