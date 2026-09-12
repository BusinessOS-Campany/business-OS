import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "../src/lib/i18n";
import { useTheme } from "../src/lib/theme";
import { api } from "../src/lib/api";
import { Button } from "../src/components/ui/Button";
import { UserPlus } from "lucide-react-native";

export default function RegisterPage() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!form.name || !form.email || !form.password) {
      Alert.alert("", t("common.fill_required"));
      return;
    }
    setLoading(true);
    try {
      const res = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      Alert.alert("", "تم إنشاء الحساب بنجاح");
      router.push("/login");
    } catch (e) {
      Alert.alert("", e.message);
    }
    setLoading(false);
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: theme.background }}>
      <View style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: theme.cardForeground, textAlign: "center" }}>{t("common.register")}</Text>
        <View style={{ gap: 12 }}>
          {[
            { key: "name", label: t("checkout.full_name"), type: "default" },
            { key: "email", label: t("checkout.email"), type: "email-address" },
            { key: "password", label: t("common.password"), type: "default", secure: true },
          ].map((field) => (
            <View key={field.key}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: theme.cardForeground, marginBottom: 4 }}>{field.label}</Text>
              <TextInput
                value={form[field.key]}
                onChangeText={(v) => setForm({ ...form, [field.key]: v })}
                keyboardType={field.type}
                secureTextEntry={field.secure}
                placeholderTextColor={theme.mutedForeground}
                style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.cardForeground }}
              />
            </View>
          ))}
        </View>
        <Button onPress={handleRegister} loading={loading} icon={<UserPlus size={18} color={theme.primaryForeground} />}>{t("common.register")}</Button>
        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={{ textAlign: "center", fontSize: 13, color: theme.primary }}>{t("common.has_account")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
