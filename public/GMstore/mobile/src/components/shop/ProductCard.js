import { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Share, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { useCart } from "../../lib/cart";
import { useAuth } from "../../lib/auth";
import { api, formatPrice, currencyLabel } from "../../lib/api";
import { localizedName } from "../../lib/utils";
import { Star, Heart, ShoppingCart, Eye, Maximize2, Share2 } from "lucide-react-native";

const CURRENCY_CYCLE = ["yer", "usd", "sar"];

export default function ProductCard({ item, style, width }) {
  const { locale } = useI18n();
  const { theme } = useTheme();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [isFav, setIsFav] = useState(item.isFavorited || false);
  const [toast, setToast] = useState(null);
  const [cartAdded, setCartAdded] = useState(false);
  const [currency, setCurrency] = useState("yer");

  function cycleCurrency() {
    setCurrency((prev) => {
      const idx = CURRENCY_CYCLE.indexOf(prev);
      return CURRENCY_CYCLE[(idx + 1) % CURRENCY_CYCLE.length];
    });
  }

  const hasDeal = item.discount > 0;
  const outOfStock = item.stock != null && item.stock <= 0;
  const slug = item.slug;
  const origPrice = hasDeal ? Number(item.price) * (1 + item.discount / 100) : Number(item.price);

  function showToast(type) {
    const msgs = {
      cart: locale === "ar" ? "تمت الإضافة!" : "Added!",
      fav: locale === "ar" ? "تمت الإضافة للمفضلة!" : "Favorited!",
      share: locale === "ar" ? "تم نسخ الرابط!" : "Link copied!",
      unfav: locale === "ar" ? "تمت الإزالة!" : "Removed!",
    };
    const colors = {
      cart: theme.success || "#10B981",
      fav: "#EF4444",
      share: "#6B7280",
      unfav: "#EF4444",
    };
    setToast({ message: msgs[type], bg: colors[type] });
    setTimeout(() => setToast(null), 1500);
  }

  async function toggleFav() {
    if (!user) { router.push("/login"); return; }
    try {
      if (isFav) {
        await api(`/favorites/${item.id}`, { method: "DELETE" });
        setIsFav(false);
        showToast("unfav");
      } else {
        await api("/favorites", { method: "POST", body: JSON.stringify({ productId: item.id }) });
        setIsFav(true);
        showToast("fav");
      }
    } catch {}
  }

  function handleAddToCart() {
    if (outOfStock) return;
    addToCart({
      productId: item.id,
      name: localizedName(item, locale),
      price: Number(item.price),
      image: item.images?.[0] || "",
      quantity: 1,
    });
    setCartAdded(true);
    showToast("cart");
    setTimeout(() => setCartAdded(false), 1500);
  }

  async function handleShare() {
    const url = `https://gmstore.com/products/${slug}`;
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard.writeText(url);
        showToast("share");
      } catch {}
    } else {
      try {
        await Share.share({ url, message: url });
      } catch {}
    }
  }

  return (
    <TouchableOpacity
      onPress={() => router.push(`/products/${slug}`)}
      activeOpacity={0.95}
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          width: width || "100%",
        },
        style,
      ]}
    >
      <View style={[styles.imageWrap, { backgroundColor: theme.muted }]}>
        <Image
          source={{ uri: item.images?.[0] }}
          style={[styles.image, { height: 250 }]}
          resizeMode="cover"
        />

        {/* Top-left badges */}
        <View style={styles.badgesCol}>
          {hasDeal && !outOfStock && (
            <View style={[styles.badge, { backgroundColor: "#E95A00" }]}>
              <Text style={styles.badgeText}>-{item.discount}%</Text>
            </View>
          )}
          {outOfStock && (
            <View style={[styles.badge, { backgroundColor: "#999" }]}>
              <Text style={styles.badgeText}>
                {locale === "ar" ? "نفذ" : "Out"}
              </Text>
            </View>
          )}
        </View>

        {/* Top-right buttons */}
        <View style={styles.topRightCol}>
          <TouchableOpacity
            onPress={toggleFav}
            style={styles.iconCircle}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Heart
              size={20}
              color={isFav ? "#EF4444" : "#4B5563"}
              fill={isFav ? "#EF4444" : "transparent"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); }}
            style={styles.iconCircle}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Maximize2 size={20} color="#4B5563" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            style={styles.iconCircle}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Share2 size={20} color="#4B5563" />
          </TouchableOpacity>
        </View>

        {/* Bottom-left quick view + share */}
        <View style={styles.bottomLeftCol}>
          <TouchableOpacity style={styles.iconCircleSm}>
            <Eye size={16} color={theme.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.iconCircleSm}>
            <Share2 size={16} color={theme.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Brand logo */}
        {item.brand && (
          <View style={styles.brandWrap}>
            <Image
              source={{ uri: item.brand.logo || item.brand }}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Color swatches */}
        {item.colors && item.colors.length > 0 && (
          <View style={styles.swatchCol}>
            {item.colors.slice(0, 3).map((color, i) => (
              <View key={i} style={[styles.swatchOuter, { backgroundColor: "rgba(0,0,0,0.3)" }]}>
                <View style={[styles.swatchInner, { backgroundColor: color, borderColor: "#fff" }]} />
              </View>
            ))}
          </View>
        )}

        {/* Toast */}
        {toast && (
          <View style={[styles.toast, { backgroundColor: toast.bg }]}>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.info}>
        <Text
          numberOfLines={2}
          style={[styles.title, { color: theme.primary }]}
        >
          {localizedName(item, locale)}
        </Text>

        {item.rating > 0 && (
          <View style={styles.ratingRow}>
            <Star size={12} color="#EAB308" fill="#EAB308" />
            <Text style={[styles.ratingText, { color: theme.primary }]}>
              {Number(item.rating).toFixed(1)}
            </Text>
          </View>
        )}

        <Text style={[styles.origPrice, { color: theme.primary }]}>
          {formatPrice(origPrice, currency)} {currencyLabel[currency]}
        </Text>

        <Text style={[styles.salePrice, { color: theme.primary }]}>
          {formatPrice(Number(item.price), currency)} {currencyLabel[currency]}
        </Text>

        {/* Action row */}
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={toggleFav} style={styles.actionBtn} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
            <Heart
              size={16}
              color={isFav ? "#F43F5E" : "#9CA3AF"}
              fill={isFav ? "#F43F5E" : "transparent"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleAddToCart}
            style={styles.actionBtn}
            disabled={outOfStock}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <ShoppingCart
              size={16}
              color={cartAdded ? "#10B981" : "#9CA3AF"}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={cycleCurrency} style={[styles.currencyToggle, { borderColor: "#D1D5DB" }]}>
            <Text style={[styles.currencyText, { color: "#9CA3AF" }]}>
              {currencyLabel[currency]}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageWrap: {
    position: "relative",
  },
  image: {
    width: "100%",
  },
  badgesCol: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 20,
    gap: 6,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  topRightCol: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 20,
    gap: 8,
    alignItems: "center",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomLeftCol: {
    position: "absolute",
    bottom: 10,
    left: 10,
    zIndex: 20,
    gap: 8,
  },
  iconCircleSm: {
    width: 36,
    height: 36,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  brandWrap: {
    position: "absolute",
    top: 52,
    left: 8,
    zIndex: 20,
  },
  brandLogo: {
    width: 50,
    height: 24,
  },
  swatchCol: {
    position: "absolute",
    bottom: 10,
    right: 10,
    zIndex: 20,
    flexDirection: "column",
    gap: 4,
  },
  swatchOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  swatchInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  toast: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingVertical: 6,
    alignItems: "center",
  },
  toastText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  info: {
    padding: 10,
    alignItems: "center",
  },
  title: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 11,
  },
  origPrice: {
    fontSize: 11,
    textDecorationLine: "line-through",
    textAlign: "center",
  },
  salePrice: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    marginTop: 8,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 999,
  },
  currencyToggle: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  currencyText: {
    fontSize: 10,
  },
});
