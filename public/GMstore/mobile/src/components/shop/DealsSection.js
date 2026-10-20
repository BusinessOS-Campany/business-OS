import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { TrendingDown } from "lucide-react-native";
import CountdownTimer from "./CountdownTimer";
import ProductCard from "./ProductCard";

const CARD_GAP = 12;
const PADDING = 16;
const cardWidth = (Dimensions.get("window").width - PADDING * 2 - CARD_GAP) / 2;

export default function DealsSection({ products, target }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();

  if (!products?.length) return null;

  const rows = [];
  for (let i = 0; i < products.length; i += 2) {
    rows.push(products.slice(i, i + 2));
  }

  return (
    <View style={{ marginTop: 28 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: PADDING }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, flexWrap: "wrap" }}>
          <TrendingDown size={24} color="#EF4444" />
          <Text style={{ fontSize: 22, fontWeight: "700", color: theme.foreground }}>{t("home.deals")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 12, color: theme.mutedForeground }}>{t("home.deal_ends")}</Text>
            <CountdownTimer target={target} />
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push("/products?onSale=true")}>
          <Text style={{ fontSize: 14, color: theme.primary, textDecorationLine: "underline" }}>{t("home.view_all")}</Text>
        </TouchableOpacity>
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
