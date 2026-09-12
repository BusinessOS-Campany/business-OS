import { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "../src/lib/i18n";
import { useTheme } from "../src/lib/theme";
import { api, formatPrice, currencyLabel } from "../src/lib/api";
import { localizedName } from "../src/lib/utils";
import { ShoppingBag, Eye } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { reportScroll } from "../src/lib/scroll-state";
import HeroSlider from "../src/components/shop/HeroSlider";
import ProductCard from "../src/components/shop/ProductCard";
import DealsSection from "../src/components/shop/DealsSection";

const CARD_GAP = 12;
const PADDING = 16;
const cardWidth = (Dimensions.get("window").width - PADDING * 2 - CARD_GAP) / 2;

function CategoryGrid({ categories }) {
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();

  if (!categories?.length) return null;

  const cols = [];
  for (let i = 0; i < categories.length; i += 3) {
    cols.push(categories.slice(i, i + 3));
  }

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
      <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: theme.foreground, marginBottom: 20 }}>{t("home.categories")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 24 }}>
          {cols.map((col, ci) => (
            <View key={ci} style={{ gap: 12 }}>
              {col.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => router.push(`/products?category=${item.slug || item.id}`)} style={{ alignItems: "center", gap: 4 }}>
                  <View style={{ width: 60, height: 60, borderRadius: 25, overflow: "hidden", justifyContent: "center", alignItems: "center" }}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={{ width: 60, height: 60, resizeMode: "cover" }} />
                    ) : (
                      <ShoppingBag size={24} color={theme.mutedForeground} />
                    )}
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "500", color: theme.foreground, textAlign: "center", lineHeight: 18 }}>
                    {localizedName(item, locale)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function ProductSection({ title, products, onSeeAll, loading }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  if (loading) return <View style={{ height: 260 }} />;
  if (!products?.length) return null;
  const rows = [];
  for (let i = 0; i < products.length; i += 2) {
    rows.push(products.slice(i, i + 2));
  }
  return (
    <View style={{ marginTop: 28 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingHorizontal: PADDING }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: theme.foreground }}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={{ fontSize: 14, color: theme.primary, textDecorationLine: "underline" }}>{t("home.view_all")}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={{ paddingHorizontal: PADDING, gap: CARD_GAP }}>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: "row", gap: CARD_GAP }}>
            {row.map((item) => (
              <View key={item.id} style={{ width: cardWidth }}>
                <ProductCard item={item} width={cardWidth} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function RecentlyViewed() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("recentlyViewed")
      .then((data) => {
        const slugs = data ? JSON.parse(data) : [];
        if (slugs.length > 0) {
          return api(`/products?slugs=${slugs.join(",")}`).then(setProducts);
        }
        setProducts([]);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || products.length === 0) return null;

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 28 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Eye size={20} color={theme.foreground} />
        <Text style={{ fontSize: 18, fontWeight: "700", color: theme.foreground }}>{t("home.recently_viewed")}</Text>
      </View>
      <FlatList
        horizontal
        data={products}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/products/${item.slug}`)} style={{ width: 160, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
            <Image source={{ uri: item.images?.[0] }} style={{ width: 160, height: 160, backgroundColor: theme.muted }} />
            <View style={{ padding: 8, gap: 2 }}>
              <Text numberOfLines={2} style={{ fontSize: 12, fontWeight: "500", color: theme.foreground }}>{localizedName(item, locale)}</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: theme.primary }}>{formatPrice(Number(item.price))} {currencyLabel.yer}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

export default function HomePage() {
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [deals, setDeals] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 5000);
    Promise.all([
      api("/banners").catch(() => []),
      api("/categories").catch(() => []),
      api("/products?featured=true&limit=10").catch(() => []),
      api("/products?discount=true&limit=10").catch(() => []),
      api("/products?sort=sales&limit=10").catch(() => []),
      api("/products?latest=true&limit=10").catch(() => []),
    ]).then(([b, c, f, d, bs, l]) => {
      clearTimeout(timer);
      setBanners(b?.filter((x) => x.active) || []);
      setCategories(c || []);
      setFeatured(f || []);
      setDeals(d || []);
      setBestSellers(bs || []);
      setLatest(l || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      onScroll={(e) => reportScroll(e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={16}
    >
      <HeroSlider slides={banners} />

      <CategoryGrid categories={categories} />

      <DealsSection products={deals} target={new Date(Date.now() + 86400000).toISOString()} />

      <ProductSection
        title={t("home.featured")}
        products={featured}
        onSeeAll={() => router.push("/products?featured=true")}
      />

      <ProductSection
        title={t("home.best_seller")}
        products={bestSellers}
      />

      <ProductSection
        title={t("home.latest")}
        products={latest}
        onSeeAll={() => router.push("/products")}
      />

      <RecentlyViewed />

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}
