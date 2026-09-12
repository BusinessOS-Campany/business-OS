import { useEffect, useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "../src/lib/i18n";
import { api, formatPrice, currencyLabel } from "../src/lib/api";
import { Heart, Trash2, ShoppingBag } from "lucide-react-native";
import { reportScroll } from "../src/lib/scroll-state";
import { useTheme } from "../src/lib/theme";

export default function FavoritesPage() {
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/favorites").then((data) => { setItems(data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function removeFavorite(productId) {
    try {
      await api(`/favorites/${productId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.productId !== productId));
    } catch {
      Alert.alert("", t("general.error"));
    }
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 100 }} size="large" color={theme.primary} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: theme.foreground }}>{t("common.favorites")}</Text>
        {items.length > 0 && <Text style={{ fontSize: 13, color: theme.mutedForeground }}>{items.length} {t("common.products")}</Text>}
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        onScroll={(e) => reportScroll(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/products/${item.product?.slug || item.slug}`)} style={{ flexDirection: "row", backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 12, gap: 12 }}>
            <Image source={{ uri: item.product?.images?.[0] || item.image }} style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: theme.muted }} />
            <View style={{ flex: 1, justifyContent: "center", gap: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.cardForeground }}>{locale === "en" && item.product?.nameEn ? item.product.nameEn : item.product?.name || item.name}</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.primary }}>{formatPrice(Number(item.product?.price || item.price))} {currencyLabel.yer}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                <TouchableOpacity onPress={() => router.push(`/products/${item.product?.slug || item.slug}`)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <ShoppingBag size={14} color={theme.primary} />
                  <Text style={{ fontSize: 12, color: theme.primary }}>{t("product.view")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeFavorite(item.productId || item.id)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Trash2 size={14} color={theme.destructive} />
                  <Text style={{ fontSize: 12, color: theme.destructive }}>{t("common.remove")}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Heart size={20} color={theme.primary} fill={theme.primary} style={{ marginTop: 4 }} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60, gap: 12 }}>
            <Heart size={48} color={theme.border} />
            <Text style={{ fontSize: 16, color: theme.mutedForeground }}>{t("common.favorites_empty")}</Text>
            <TouchableOpacity onPress={() => router.push("/products")} style={{ backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}>
              <Text style={{ color: theme.primaryForeground, fontWeight: "600" }}>{t("cart.continue_shopping")}</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
