import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { useTheme } from "../../src/lib/theme";
import { useI18n } from "../../src/lib/i18n";
import { useAuth } from "../../src/lib/auth";
import { api } from "../../src/lib/api";
import { Input } from "../../src/components/ui/Input";
import { Button } from "../../src/components/ui/Button";
import { Card } from "../../src/components/ui/Card";

export default function MerchantSettingsPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", nameEn: "", phone: "", email: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || "", nameEn: user.nameEn || "", phone: user.phone || "", email: user.email || "" });
      setLoading(false);
    }
  }, [user]);

  async function handleSave() {
    try {
      await api("/merchant/profile", { method: "PUT", body: JSON.stringify(form) });
      Alert.alert("", t("merchant.saved"));
    } catch (e) {
      Alert.alert("", e.message);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: 16 }}>
        <Text style={[styles.title, { color: theme.foreground }]}>{t("merchant.account_settings")}</Text>
        <Card>
          <View style={{ padding: 16, gap: 12 }}>
            <Input label="Name (Ar)" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            <Input label="Name (En)" value={form.nameEn} onChangeText={(v) => setForm({ ...form, nameEn: v })} />
            <Input label={t("checkout.phone")} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
            <Input label={t("checkout.email")} value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" />
            <Button onPress={handleSave} disabled={loading}>{t("merchant.save")}</Button>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
});
