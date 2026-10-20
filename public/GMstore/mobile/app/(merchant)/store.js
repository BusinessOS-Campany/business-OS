import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useTheme } from "../../src/lib/theme";
import { useI18n } from "../../src/lib/i18n";
import { api } from "../../src/lib/api";
import { Input } from "../../src/components/ui/Input";
import { Button } from "../../src/components/ui/Button";
import { Card } from "../../src/components/ui/Card";

export default function MerchantStorePage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [profile, setProfile] = useState({ name: "", nameEn: "", description: "", descriptionEn: "", phone: "", email: "", address: "", whatsapp: "", telegram: "", instagram: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/merchant/store").then((data) => {
      if (data) setProfile((prev) => ({ ...prev, ...data }));
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    await api("/merchant/store", { method: "PUT", body: JSON.stringify(profile) });
    Alert.alert("", t("merchant.saved"));
  }

  if (loading) {
    return <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 100 }} />;
  }

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={[styles.title, { color: theme.foreground }]}>{t("merchant.store_settings")}</Text>

      <Card style={{ marginBottom: 16 }}>
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={[styles.sectionHeader, { color: theme.primary }]}>Store Info</Text>
          <Input label="Name (Ar)" value={profile.name} onChangeText={(v) => setProfile({ ...profile, name: v })} />
          <Input label="Name (En)" value={profile.nameEn} onChangeText={(v) => setProfile({ ...profile, nameEn: v })} />
          <Input label="Description (Ar)" value={profile.description} onChangeText={(v) => setProfile({ ...profile, description: v })} multiline numberOfLines={3} />
          <Input label="Description (En)" value={profile.descriptionEn} onChangeText={(v) => setProfile({ ...profile, descriptionEn: v })} multiline numberOfLines={3} />
        </View>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={[styles.sectionHeader, { color: theme.primary }]}>Contact Info</Text>
          <Input label="Phone" value={profile.phone} onChangeText={(v) => setProfile({ ...profile, phone: v })} keyboardType="phone-pad" />
          <Input label="Email" value={profile.email} onChangeText={(v) => setProfile({ ...profile, email: v })} keyboardType="email-address" />
          <Input label="Address" value={profile.address} onChangeText={(v) => setProfile({ ...profile, address: v })} />
        </View>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={[styles.sectionHeader, { color: theme.primary }]}>Social Links</Text>
          <Input label="WhatsApp" value={profile.whatsapp} onChangeText={(v) => setProfile({ ...profile, whatsapp: v })} keyboardType="url" />
          <Input label="Telegram" value={profile.telegram} onChangeText={(v) => setProfile({ ...profile, telegram: v })} keyboardType="url" />
          <Input label="Instagram" value={profile.instagram} onChangeText={(v) => setProfile({ ...profile, instagram: v })} keyboardType="url" />
        </View>
      </Card>

      <Button onPress={handleSave} style={{ marginBottom: 24 }}>{t("merchant.save")}</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  sectionHeader: { fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
});
