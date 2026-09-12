import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "../../src/lib/i18n";
import { useTheme } from "../../src/lib/theme";
import { Button } from "../../src/components/ui/Button";
import { Package, Search } from "lucide-react-native";

export default function TrackSearchPage() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();
  const [orderId, setOrderId] = useState("");

  function handleSearch() {
    if (orderId.trim()) router.push(`/track/${orderId.trim()}`);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ alignItems: "center", padding: 40, gap: 12 }}>
        <Package size={56} color={theme.primary} />
        <Text style={{ fontSize: 22, fontWeight: "700", color: theme.foreground }}>{t("track.title")}</Text>
      </View>
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: "500", color: theme.foreground }}>{t("track.order_id")}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={orderId}
            onChangeText={setOrderId}
            placeholder="أدخل رقم الطلب"
            placeholderTextColor={theme.mutedForeground}
            onSubmitEditing={handleSearch}
            style={{ flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: theme.foreground, fontFamily: "monospace" }}
          />
          <Button onPress={handleSearch}><Search size={18} color={theme.primaryForeground} /></Button>
        </View>
      </View>
    </View>
  );
}
