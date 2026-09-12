import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/lib/theme";
import { useI18n } from "../../src/lib/i18n";
import { api } from "../../src/lib/api";
import { Card } from "../../src/components/ui/Card";

export default function AdminProductsPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/products`).then((data) => {
      setProducts(data || []);
      setLoading(false);
    });
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={[styles.title, { color: theme.foreground }]}>{t("admin.products")}</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 8 }}>
            <View style={{ padding: 12, flexDirection: "row", gap: 12 }}>
              {item.images?.[0] && <Image source={{ uri: item.images[0] }} style={{ width: 64, height: 64, borderRadius: 8 }} />}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.foreground, fontWeight: "500" }}>{item.name}</Text>
                <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{item.category?.name}</Text>
                <Text style={{ color: theme.primary, fontWeight: "700" }}>{Number(item.price).toFixed(2)} ريال</Text>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={loading ? <ActivityIndicator /> : <Text style={{ textAlign: "center", color: theme.mutedForeground }}>{t("common.no_data")}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
});
