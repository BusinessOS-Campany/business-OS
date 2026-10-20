import { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Dimensions, FlatList } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useI18n } from "../../src/lib/i18n";
import { useTheme } from "../../src/lib/theme";
import { useCart } from "../../src/lib/cart";
import { useAuth } from "../../src/lib/auth";
import { api, formatPrice, currencyLabel } from "../../src/lib/api";
import { Button } from "../../src/components/ui/Button";
import { Badge } from "../../src/components/ui/Badge";
import { Star, Check, Plus, Minus, ShoppingCart, ChevronDown, ChevronUp, Truck, ShieldCheck, RotateCcw, Headphones, MessageCircle, User, Clock } from "lucide-react-native";
import { reportScroll } from "../../src/lib/scroll-state";
import ProductCard from "../../src/components/shop/ProductCard";

const { width } = Dimensions.get("window");

export default function ProductDetailPage() {
  const { slug } = useLocalSearchParams();
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const { addToCart } = useCart();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showSpecs, setShowSpecs] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const styles = useStyles(theme);

  useEffect(() => {
    api(`/products/${slug}`).then((data) => {
      setProduct(data);
      setSelectedColor(data.colors?.[0] || null);
      setSelectedSize(data.sizes?.[0] || null);
      setLoading(false);
    });
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    api(`/reviews?productId=${product.id}`).then((data) => {
      setReviews(Array.isArray(data) ? data : []);
      setReviewsLoading(false);
    });
  }, [product]);

  useEffect(() => {
    if (!product?.category?.id) return;
    api(`/products?category=${product.category.id}&limit=10`).then((data) => {
      const list = Array.isArray(data) ? data : data?.products || data?.data || [];
      setRelatedProducts(list.filter((p) => p.id !== product.id));
      setRelatedLoading(false);
    });
  }, [product]);

  if (loading) return <ActivityIndicator style={{ marginTop: 100 }} size="large" color={theme.primary} />;
  if (!product) return <Text style={{ textAlign: "center", marginTop: 100, color: theme.mutedForeground }}>{t("common.error")}</Text>;

  function handleAdd() {
    addToCart({
      productId: product.id,
      name: locale === "en" && product.nameEn ? product.nameEn : product.name,
      price: Number(product.price),
      image: product.images?.[0] || "",
      color: selectedColor || undefined,
      size: selectedSize || undefined,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  async function handleSubmitReview() {
    if (reviewRating === 0 || !reviewComment.trim()) return;
    setReviewSubmitting(true);
    try {
      await api("/reviews", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, rating: reviewRating, comment: reviewComment }),
      });
      setReviewSubmitted(true);
      setReviewRating(0);
      setReviewComment("");
      api(`/reviews?productId=${product.id}`).then((data) => {
        setReviews(Array.isArray(data) ? data : []);
      });
    } catch (e) {
      // ignore
    } finally {
      setReviewSubmitting(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  const specs = product.specs ? (typeof product.specs === "object" ? product.specs : {}) : {};
  const images = product.images || [];
  const hasDeal = product.discount > 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}
      onScroll={(e) => reportScroll(e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={16}>
      <View style={{ height: 350, backgroundColor: theme.muted }}>
        {images.length > 0 && (
          <>
            <Image source={{ uri: images[activeImage] }} style={{ width, height: 350, resizeMode: "contain" }} />
            {images.length > 1 && (
              <View style={{ position: "absolute", bottom: 12, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 }}>
                {images.map((_, i) => (
                  <TouchableOpacity key={i} onPress={() => setActiveImage(i)}
                    style={{ width: activeImage === i ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: activeImage === i ? theme.primary : "rgba(0,0,0,0.2)" }}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        {product.category && <Badge label={product.category.name} variant="default" />}
        <Text style={{ fontSize: 20, fontWeight: "700", color: theme.foreground }}>
          {locale === "en" && product.nameEn ? product.nameEn : product.name}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={14} color={i <= (product.rating || 0) ? theme.warning : theme.border} fill={i <= (product.rating || 0) ? theme.warning : "none"} />
            ))}
          </View>
          <Text style={{ fontSize: 12, color: theme.mutedForeground }}>({product.reviewsCount || 0})</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: theme.primary }}>{formatPrice(Number(product.price))} {currencyLabel.yer}</Text>
          {hasDeal && (
            <>
              <Text style={{ fontSize: 14, color: theme.mutedForeground, textDecorationLine: "line-through" }}>
                {formatPrice(Number(product.price) * (1 + product.discount / 100))} {currencyLabel.yer}
              </Text>
              <Badge label={`-${product.discount}%`} variant="danger" />
            </>
          )}
        </View>

        {product.description && (
          <Text style={{ fontSize: 14, color: theme.mutedForeground, lineHeight: 22 }}>{product.description}</Text>
        )}

        <View style={styles.deliveryCard}>
          <Truck size={20} color={theme.success} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: theme.foreground }}>{t("product.delivery_estimate")}</Text>
            <Text style={{ fontSize: 13, color: theme.success, fontWeight: "600" }}>{t("product.delivery_days")}</Text>
          </View>
        </View>

        {product.stock <= 5 && product.stock > 0 && (
          <Badge label={`لم يتبق سوى ${product.stock} قطع`} variant="warning" />
        )}

        {product.colors?.length > 0 && (
          <View>
            <Text style={{ fontSize: 14, fontWeight: "500", color: theme.foreground, marginBottom: 8 }}>اللون: {selectedColor}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {product.colors.map((c) => (
                <TouchableOpacity key={c} onPress={() => setSelectedColor(c)} style={{
                  width: 36, height: 36, borderRadius: 18, backgroundColor: c,
                  borderWidth: selectedColor === c ? 2 : 1,
                  borderColor: selectedColor === c ? theme.primary : theme.border,
                  justifyContent: "center", alignItems: "center",
                }}>
                  {selectedColor === c && <Check size={16} color={c === "#ffffff" || c === "#fff" ? theme.primary : theme.primaryForeground} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {product.sizes?.length > 0 && (
          <View>
            <Text style={{ fontSize: 14, fontWeight: "500", color: theme.foreground, marginBottom: 8 }}>المقاس: {selectedSize}</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {product.sizes.map((s) => (
                <TouchableOpacity key={s} onPress={() => setSelectedSize(s)} style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
                  borderWidth: 1, borderColor: selectedSize === s ? theme.primary : theme.border,
                  backgroundColor: selectedSize === s ? theme.primary : theme.card,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: selectedSize === s ? theme.primaryForeground : theme.foreground }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: theme.foreground }}>الكمية:</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 8 }}>
            <TouchableOpacity onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={{ padding: 8 }}>
              <Minus size={18} color={theme.foreground} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: "600", color: theme.foreground, minWidth: 24, textAlign: "center" }}>{quantity}</Text>
            <TouchableOpacity onPress={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))} style={{ padding: 8 }}>
              <Plus size={18} color={theme.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Button onPress={handleAdd} disabled={product.stock <= 0} style={{ flex: 1 }} icon={<ShoppingCart size={18} color="#fff" />}>
            {product.stock <= 0 ? t("product.out_of_stock") : added ? t("product.added") : t("product.add_to_cart")}
          </Button>
        </View>

        <View style={styles.trustBadgesRow}>
          <View style={styles.trustBadgeCard}>
            <Truck size={22} color={theme.primary} />
            <Text style={styles.trustBadgeLabel}>{t("product.trust_shipping")}</Text>
          </View>
          <View style={styles.trustBadgeCard}>
            <ShieldCheck size={22} color={theme.primary} />
            <Text style={styles.trustBadgeLabel}>{t("product.trust_payment")}</Text>
          </View>
          <View style={styles.trustBadgeCard}>
            <RotateCcw size={22} color={theme.primary} />
            <Text style={styles.trustBadgeLabel}>{t("product.trust_return")}</Text>
          </View>
          <View style={styles.trustBadgeCard}>
            <Headphones size={22} color={theme.primary} />
            <Text style={styles.trustBadgeLabel}>{t("product.trust_support")}</Text>
          </View>
        </View>

        {Object.keys(specs).length > 0 && (
          <View style={{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
            <TouchableOpacity onPress={() => setShowSpecs(!showSpecs)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground }}>{t("product.specs")}</Text>
              {showSpecs ? <ChevronUp size={18} color={theme.mutedForeground} /> : <ChevronDown size={18} color={theme.mutedForeground} />}
            </TouchableOpacity>
            {showSpecs && (
              <View style={{ padding: 14, paddingTop: 0, gap: 8 }}>
                {Object.entries(specs).map(([k, v]) => (
                  <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: theme.muted, paddingBottom: 6 }}>
                    <Text style={{ fontSize: 13, color: theme.mutedForeground }}>{k}</Text>
                    <Text style={{ fontSize: 13, fontWeight: "500", color: theme.foreground }}>{String(v)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.sectionCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <MessageCircle size={18} color={theme.foreground} />
            <Text style={styles.sectionTitle}>{t("product.reviews")}</Text>
          </View>

          {reviewsLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : reviews.length === 0 ? (
            <Text style={{ fontSize: 13, color: theme.mutedForeground, textAlign: "center", paddingVertical: 16 }}>
              {t("product.no_reviews")}
            </Text>
          ) : (
            reviews.slice(0, 5).map((review, i) => (
              <View key={review.id || i} style={styles.reviewItem}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <User size={14} color={theme.mutedForeground} />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground }}>
                      {review.userName || review.name || t("common.anonymous")}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={12} color={s <= (review.rating || 0) ? theme.warning : theme.border} fill={s <= (review.rating || 0) ? theme.warning : "none"} />
                    ))}
                  </View>
                </View>
                {review.comment && (
                  <Text style={{ fontSize: 13, color: theme.mutedForeground, lineHeight: 20, marginTop: 6 }}>{review.comment}</Text>
                )}
                {review.createdAt && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                    <Clock size={12} color={theme.mutedForeground} />
                    <Text style={{ fontSize: 11, color: theme.mutedForeground }}>{formatDate(review.createdAt)}</Text>
                  </View>
                )}
                {i < reviews.length - 1 && i < 4 && <View style={styles.reviewDivider} />}
              </View>
            ))
          )}

          <View style={styles.reviewForm}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground, marginBottom: 8 }}>{t("product.write_review")}</Text>
            {reviewSubmitted ? (
              <Text style={{ fontSize: 13, color: theme.success, textAlign: "center", paddingVertical: 12 }}>
                {t("product.review_success")}
              </Text>
            ) : (
              <>
                <View style={{ flexDirection: "row", gap: 4, marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity key={s} onPress={() => setReviewRating(s)}>
                      <Star size={22} color={s <= reviewRating ? theme.warning : theme.border} fill={s <= reviewRating ? theme.warning : "none"} />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.reviewInput}
                  placeholder={t("product.comment_placeholder")}
                  placeholderTextColor={theme.mutedForeground}
                  multiline
                  value={reviewComment}
                  onChangeText={setReviewComment}
                />
                <Button
                  onPress={handleSubmitReview}
                  disabled={reviewRating === 0 || !reviewComment.trim() || reviewSubmitting}
                  style={{ marginTop: 8 }}
                >
                  {reviewSubmitting ? t("common.loading") : t("product.submit_review")}
                </Button>
              </>
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("product.related_products")}</Text>
          {relatedLoading ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ paddingVertical: 16 }} />
          ) : relatedProducts.length === 0 ? (
            <Text style={{ fontSize: 13, color: theme.mutedForeground, textAlign: "center", paddingVertical: 16 }}>
              {t("product.no_related")}
            </Text>
          ) : (
            <FlatList
              horizontal
              data={relatedProducts}
              keyExtractor={(item) => String(item.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
              renderItem={({ item }) => <ProductCard item={item} width={150} />}
            />
          )}
        </View>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function useStyles(theme) {
  return {
    deliveryCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      gap: 12,
    },
    trustBadgesRow: {
      flexDirection: "row",
      gap: 8,
    },
    trustBadgeCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 10,
      paddingHorizontal: 4,
      alignItems: "center",
      gap: 6,
    },
    trustBadgeLabel: {
      fontSize: 10,
      color: theme.mutedForeground,
      textAlign: "center",
      fontWeight: "500",
    },
    sectionCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.foreground,
    },
    reviewItem: {
      paddingVertical: 8,
    },
    reviewDivider: {
      height: 1,
      backgroundColor: theme.muted,
      marginTop: 8,
    },
    reviewForm: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    reviewInput: {
      backgroundColor: theme.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 10,
      fontSize: 13,
      color: theme.foreground,
      minHeight: 72,
      textAlignVertical: "top",
    },
    relatedCard: {
      width: 140,
      backgroundColor: theme.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
    },
    relatedImage: {
      width: 140,
      height: 140,
      resizeMode: "contain",
      backgroundColor: theme.muted,
    },
  };
}
