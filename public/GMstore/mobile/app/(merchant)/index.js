import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from "react-native";
import { useTheme } from "../../src/lib/theme";
import { useI18n } from "../../src/lib/i18n";
import { api } from "../../src/lib/api";
import { Card } from "../../src/components/ui/Card";

export default function MerchantDashboardPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [bestSellers, setBestSellers] = useState([]);

  useEffect(() => {
    api("/merchant/stats").then(setStats).catch(() => {});
    api("/merchant/best-sellers").then(setBestSellers).catch(() => {});
  }, []);

  if (!stats) return <ActivityIndicator style={{ marginTop: 100 }} size="large" color={theme.primary} />;

  const cards = [
    { label: t("merchant.total_products"), value: stats.totalProducts, color: theme.foreground },
    { label: t("merchant.revenue"), value: `${stats.totalRevenue?.toFixed(2)} ريال`, color: theme.primary },
    { label: "القابل للسحب", value: `${stats.withdrawableBalance?.toFixed(2)} ريال`, color: theme.success },
    { label: t("merchant.orders_count"), value: stats.totalOrders, color: theme.foreground },
  ];

  if (stats.todayOrders !== undefined) {
    cards.splice(3, 0, { label: "طلبات اليوم", value: stats.todayOrders, color: theme.warning });
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={[styles.title, { color: theme.foreground }]}>Merchant Dashboard</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {cards.map((c, i) => (
          <Card key={i} style={{ flex: 1, minWidth: 140 }}>
            <View style={{ padding: 16 }}>
              <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{c.label}</Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: c.color }}>{c.value}</Text>
            </View>
          </Card>
        ))}
      </View>

      {bestSellers.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Best Selling Products</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {bestSellers.map((product) => (
                <Card key={product.id} style={{ width: 160 }}>
                  <TouchableOpacity activeOpacity={0.8}>
                    {product.image ? (
                      <Image source={{ uri: product.image }} style={{ width: "100%", height: 120, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                    ) : (
                      <View style={{ width: "100%", height: 120, backgroundColor: theme.border, borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>No Image</Text>
                      </View>
                    )}
                    <View style={{ padding: 10, gap: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground }} numberOfLines={1}>{product.name}</Text>
                      <Text style={{ fontSize: 12, color: theme.primary, fontWeight: "700" }}>{Number(product.price)?.toFixed(2)} ريال</Text>
                      <Text style={{ fontSize: 11, color: theme.mutedForeground }}>{product.sales ?? 0} مبيعات</Text>
                    </View>
                  </TouchableOpacity>
                </Card>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
});
