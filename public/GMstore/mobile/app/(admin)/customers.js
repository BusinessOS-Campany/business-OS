import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "../../src/lib/theme";
import { useI18n } from "../../src/lib/i18n";
import { api } from "../../src/lib/api";
import { Card } from "../../src/components/ui/Card";

export default function AdminCustomersPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/users").then((data) => {
      setUsers(data || []);
      setLoading(false);
    });
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={[styles.title, { color: theme.foreground }]}>{t("admin.customers")}</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 8 }}>
            <View style={{ padding: 12, gap: 2 }}>
              <Text style={{ color: theme.foreground, fontWeight: "500" }}>{item.name || "—"}</Text>
              <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{item.email}</Text>
              <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>نقاط: {item.points || 0}</Text>
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
