import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../src/lib/theme";
import { useI18n } from "../../src/lib/i18n";
import { api } from "../../src/lib/api";
import { Card } from "../../src/components/ui/Card";

export default function AdminAnalyticsPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [data, setData] = useState(null);

  useEffect(() => {
    api("/admin/analytics").then(setData).catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={[styles.title, { color: theme.foreground }]}>{t("admin.analytics")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Card style={{ flex: 1, minWidth: 140 }}>
          <View style={{ padding: 16 }}>
            <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{t("admin.total_orders")}</Text>
            <Text style={{ fontSize: 24, fontWeight: "700", color: theme.foreground }}>{data?.totalOrders || 0}</Text>
          </View>
        </Card>
        <Card style={{ flex: 1, minWidth: 140 }}>
          <View style={{ padding: 16 }}>
            <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{t("admin.total_revenue")}</Text>
            <Text style={{ fontSize: 24, fontWeight: "700", color: theme.primary }}>{data?.totalRevenue?.toFixed(2) || "0.00"} ريال</Text>
          </View>
        </Card>
        <Card style={{ flex: 1, minWidth: 140 }}>
          <View style={{ padding: 16 }}>
            <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{t("admin.total_users")}</Text>
            <Text style={{ fontSize: 24, fontWeight: "700", color: theme.foreground }}>{data?.totalUsers || 0}</Text>
          </View>
        </Card>
        <Card style={{ flex: 1, minWidth: 140 }}>
          <View style={{ padding: 16 }}>
            <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{t("admin.total_products")}</Text>
            <Text style={{ fontSize: 24, fontWeight: "700", color: theme.foreground }}>{data?.totalProducts || 0}</Text>
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
});
