import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "../src/lib/i18n";
import { useTheme } from "../src/lib/theme";
import { useAuth } from "../src/lib/auth";
import { setAuthToken } from "../src/lib/api";
import { Button } from "../src/components/ui/Button";
import { LogIn, Eye, EyeOff } from "lucide-react-native";

export default function LoginPage() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("", t("common.fill_required"));
      return;
    }
    setLoading(true);
    try {
      const res = await login(email, password);
      setAuthToken(res.token);
      const role = res.user.role;
      if (role === "ADMIN") router.replace("/(admin)");
      else if (role === "MERCHANT") router.replace("/(merchant)");
      else router.replace("/");
    } catch (e) {
      Alert.alert("", e.message || "فشل تسجيل الدخول");
    }
    setLoading(false);
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: theme.background }}>
      <View style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: theme.cardForeground, textAlign: "center" }}>{t("common.login")}</Text>
        <View style={{ gap: 12 }}>
          <View>
            <Text style={{ fontSize: 13, fontWeight: "500", color: theme.cardForeground, marginBottom: 4 }}>{t("checkout.email")}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="example@email.com"
              placeholderTextColor={theme.mutedForeground}
              style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.cardForeground }}
            />
          </View>
          <View>
            <Text style={{ fontSize: 13, fontWeight: "500", color: theme.cardForeground, marginBottom: 4 }}>{t("common.password")}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 12 }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.mutedForeground}
                style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: theme.cardForeground }}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} color={theme.mutedForeground} /> : <Eye size={18} color={theme.mutedForeground} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <Button onPress={handleLogin} loading={loading} icon={<LogIn size={18} color={theme.primaryForeground} />}>
          {t("common.login")}
        </Button>
        <TouchableOpacity onPress={() => router.push("/register")}>
          <Text style={{ textAlign: "center", fontSize: 13, color: theme.primary }}>{t("common.no_account")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
