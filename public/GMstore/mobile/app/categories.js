import { useEffect, useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "../src/lib/i18n";
import { useTheme } from "../src/lib/theme";
import { api } from "../src/lib/api";
import { Package } from "lucide-react-native";

export default function CategoriesPage() {
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/categories").then((data) => { setCategories(data || []); setLoading(false); });
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 100 }} size="large" color={theme.primary} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.foreground, padding: 16 }}>{t("common.categories")}</Text>
      <FlatList
        data={categories}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ paddingHorizontal: 12, gap: 12 }}
        contentContainerStyle={{ paddingBottom: 20, gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/products?category=${item.id}`)}
            style={{ flex: 1, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: "center", padding: 20, gap: 8 }}
          >
            {item.image ? <Image source={{ uri: item.image }} style={{ width: 64, height: 64, borderRadius: 32 }} /> : <Package size={40} color={theme.primary} />}
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground, textAlign: "center" }}>
              {locale === "en" && item.nameEn ? item.nameEn : item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
