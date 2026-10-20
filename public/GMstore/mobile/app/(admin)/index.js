import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "../../src/lib/theme";
import { useI18n } from "../../src/lib/i18n";
import { api } from "../../src/lib/api";
import { Card } from "../../src/components/ui/Card";

export default function AdminDashboardPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api("/admin/analytics").catch(() => null),
      api("/orders/all?page=1&limit=5").catch(() => []),
    ]).then(([analytics, recentOrders]) => {
      setStats({
        totalOrders: analytics?.totalOrders || 0,
        totalRevenue: analytics?.totalRevenue || 0,
        totalProducts: analytics?.totalProducts || 0,
        totalUsers: analytics?.totalUsers || 0,
        recentOrders: recentOrders || [],
      });
      setLoading(false);
    });
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 80 }} size="large" color={theme.primary} />;

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={[styles.title, { color: theme.foreground }]}>GMStore {t("admin.dashboard")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Card style={{ flex: 1, minWidth: 140 }}>
          <View style={{ padding: 16 }}>
            <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{t("admin.total_orders")}</Text>
            <Text style={{ fontSize: 24, fontWeight: "700", color: theme.foreground }}>{stats.totalOrders}</Text>
          </View>
        </Card>
        <Card style={{ flex: 1, minWidth: 140 }}>
          <View style={{ padding: 16 }}>
            <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{t("admin.total_revenue")}</Text>
            <Text style={{ fontSize: 24, fontWeight: "700", color: theme.primary }}>{Number(stats.totalRevenue).toFixed(2)} ريال</Text>
          </View>
        </Card>
        <Card style={{ flex: 1, minWidth: 140 }}>
          <View style={{ padding: 16 }}>
            <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{t("admin.total_products")}</Text>
            <Text style={{ fontSize: 24, fontWeight: "700", color: theme.foreground }}>{stats.totalProducts}</Text>
          </View>
        </Card>
        <Card style={{ flex: 1, minWidth: 140 }}>
          <View style={{ padding: 16 }}>
            <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{t("admin.total_users")}</Text>
            <Text style={{ fontSize: 24, fontWeight: "700", color: theme.foreground }}>{stats.totalUsers}</Text>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
});
