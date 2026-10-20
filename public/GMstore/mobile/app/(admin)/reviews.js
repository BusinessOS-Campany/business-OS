import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "../../src/lib/theme";
import { useI18n } from "../../src/lib/i18n";
import { api } from "../../src/lib/api";
import { Card } from "../../src/components/ui/Card";

export default function AdminReviewsPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/reviews").then((data) => {
      setReviews(data || []);
      setLoading(false);
    });
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={[styles.title, { color: theme.foreground }]}>{t("admin.reviews")}</Text>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 8 }}>
            <View style={{ padding: 12, gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Text key={i} style={{ color: i < item.rating ? theme.warning : theme.mutedForeground }}>★</Text>
                ))}
              </View>
              <Text style={{ color: theme.foreground, fontSize: 13 }}>{item.comment}</Text>
              <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>{item.user?.name || "—"} • {item.product?.name || "—"}</Text>
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
