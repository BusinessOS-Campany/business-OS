import { useEffect, useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useI18n } from "../../src/lib/i18n";
import { useTheme } from "../../src/lib/theme";
import { api, formatPrice, currencyLabel } from "../../src/lib/api";
import { Search, SlidersHorizontal, Star, X } from "lucide-react-native";
import { Badge } from "../../src/components/ui/Badge";
import { reportScroll } from "../../src/lib/scroll-state";
import ProductCard from "../../src/components/shop/ProductCard";

const SORT_OPTIONS = [
  { key: "newest", label: "الأحدث", sort: "createdAt", order: "desc" },
  { key: "price_asc", label: "السعر: من الأقل", sort: "price", order: "asc" },
  { key: "price_desc", label: "السعر: من الأعلى", sort: "price", order: "desc" },
  { key: "rating", label: "التقييم", sort: "rating", order: "desc" },
];

export default function ProductsPage() {
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();
  const { category, q } = useLocalSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(q || "");
  const [activeCategory, setActiveCategory] = useState(category || null);
  const [sortOption, setSortOption] = useState(null);

  useEffect(() => {
    api("/categories").then(setCategories).catch(() => {});
  }, []);

  function fetchProducts(overrides = {}) {
    setLoading(true);
    const params = new URLSearchParams();
    const cat = overrides.category !== undefined ? overrides.category : activeCategory;
    const qry = overrides.q !== undefined ? overrides.q : search;
    const sort = overrides.sort !== undefined ? overrides.sort : sortOption;
    if (cat) params.set("category", cat);
    if (qry) params.set("q", qry);
    if (sort) {
      const opt = SORT_OPTIONS.find((o) => o.key === sort);
      if (opt) {
        params.set("sort", opt.sort);
        params.set("order", opt.order);
      }
    }
    params.set("limit", "50");
    api(`/products?${params}`).then((data) => {
      setProducts(data || []);
      setLoading(false);
    });
  }

  useEffect(() => {
    fetchProducts({ category: activeCategory });
  }, [activeCategory]);

  function handleSearch() {
    fetchProducts({ q: search, sort: sortOption });
  }

  function handleSortSelect(key) {
    const next = sortOption === key ? null : key;
    setSortOption(next);
    fetchProducts({ category: activeCategory, q: search, sort: next });
  }

  function clearSearch() {
    setSearch("");
    fetchProducts({ q: "", sort: sortOption, category: activeCategory });
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: theme.card, borderRadius: 10, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12 }}>
            <Search size={18} color={theme.mutedForeground} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              placeholder={t("common.search")}
              placeholderTextColor={theme.mutedForeground}
              style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, color: theme.foreground }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={theme.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          horizontal
          data={SORT_OPTIONS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const active = sortOption === item.key;
            return (
              <TouchableOpacity
                onPress={() => handleSortSelect(item.key)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: active ? theme.primary : theme.card,
                  borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "500", color: active ? theme.primaryForeground : theme.foreground }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const active = activeCategory === item.id;
            return (
              <TouchableOpacity
                onPress={() => setActiveCategory(active ? null : item.id)}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? theme.primary : theme.card, borderWidth: 1, borderColor: active ? theme.primary : theme.border }}
              >
                <Text style={{ fontSize: 13, fontWeight: "500", color: active ? theme.primaryForeground : theme.foreground }}>
                  {locale === "en" && item.nameEn ? item.nameEn : item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.primary} />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={{ paddingHorizontal: 12, gap: 12 }}
          contentContainerStyle={{ paddingBottom: 20, gap: 12 }}
          onScroll={(e) => reportScroll(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          renderItem={({ item }) => <ProductCard item={item} />}
          ListEmptyComponent={<Text style={{ textAlign: "center", marginTop: 40, color: theme.mutedForeground }}>{t("common.no_data")}</Text>}
        />
      )}
    </View>
  );
}
