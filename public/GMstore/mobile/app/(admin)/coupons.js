import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Alert } from "react-native";
import { useTheme } from "../../src/lib/theme";
import { useI18n } from "../../src/lib/i18n";
import { api } from "../../src/lib/api";
import { Input } from "../../src/components/ui/Input";
import { Button } from "../../src/components/ui/Button";
import { Card } from "../../src/components/ui/Card";
import { Badge } from "../../src/components/ui/Badge";

export default function AdminCouponsPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({ code: "", discount: "", expiresAt: "" });

  useEffect(() => { api("/coupons").then(setCoupons); }, []);

  async function handleCreate() {
    await api("/coupons", { method: "POST", body: JSON.stringify({ ...form, discount: parseFloat(form.discount) }) });
    Alert.alert("", t("common.saved"));
    setForm({ code: "", discount: "", expiresAt: "" });
    api("/coupons").then(setCoupons);
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={[styles.title, { color: theme.foreground }]}>{t("admin.coupons")}</Text>
      <Card style={{ marginBottom: 16 }}>
        <View style={{ padding: 16, gap: 8 }}>
          <Input label={t("coupons.code")} value={form.code} onChangeText={(v) => setForm({ ...form, code: v })} />
          <Input label={t("coupons.discount")} value={form.discount} onChangeText={(v) => setForm({ ...form, discount: v })} keyboardType="numeric" />
          <Input label={t("coupons.expires")} value={form.expiresAt} onChangeText={(v) => setForm({ ...form, expiresAt: v })} />
          <Button onPress={handleCreate}>{t("coupons.create")}</Button>
        </View>
      </Card>
      <FlatList
        data={coupons}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 8 }}>
            <View style={{ padding: 12, flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text style={{ color: theme.foreground, fontFamily: "monospace", fontSize: 14 }}>{item.code}</Text>
                <Text style={{ color: theme.primary, fontWeight: "600" }}>{Number(item.discount).toFixed(0)}%</Text>
              </View>
              <Badge label={new Date(item.expiresAt) > new Date() ? "نشط" : "منتهي"} variant={new Date(item.expiresAt) > new Date() ? "success" : "danger"} />
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
});
