import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, Alert } from "react-native";
import { useTheme } from "../../src/lib/theme";
import { useI18n } from "../../src/lib/i18n";
import { api } from "../../src/lib/api";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";

export default function MerchantReviewsPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    api("/merchant/reviews").then((data) => { setReviews(data || []); setLoading(false); });
  }, []);

  async function handleReply(id) {
    if (!replyText.trim()) return;
    await api(`/merchant/reviews/${id}/reply`, { method: "POST", body: JSON.stringify({ reply: replyText }) });
    Alert.alert("", "تم إرسال الرد");
    setReplyingId(null);
    setReplyText("");
    api("/merchant/reviews").then((data) => setReviews(data || []));
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={[styles.title, { color: theme.foreground }]}>{t("merchant.reviews")}</Text>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 8 }}>
            <View style={{ padding: 12, gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Text key={i} style={{ color: i < item.rating ? theme.warning : theme.mutedForeground }}>★</Text>
                ))}
              </View>
              <Text style={{ color: theme.foreground, fontSize: 13 }}>{item.comment}</Text>
              <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>{item.user?.name}</Text>

              {item.reply ? (
                <View style={{ marginTop: 6, padding: 8, backgroundColor: theme.muted, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: theme.primary }}>
                  <Text style={{ fontSize: 11, color: theme.mutedForeground, marginBottom: 2 }}>رد المتجر:</Text>
                  <Text style={{ color: theme.foreground, fontSize: 12 }}>{item.reply}</Text>
                </View>
              ) : replyingId === item.id ? (
                <View style={{ marginTop: 6, gap: 6 }}>
                  <TextInput
                    value={replyText}
                    onChangeText={setReplyText}
                    placeholder="اكتب الرد..."
                    placeholderTextColor={theme.mutedForeground}
                    multiline
                    style={{
                      borderWidth: 1, borderColor: theme.border, borderRadius: 8,
                      padding: 10, fontSize: 13, color: theme.foreground, minHeight: 60,
                    }}
                  />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Button size="sm" onPress={() => handleReply(item.id)}>إرسال</Button>
                    <Button size="sm" variant="ghost" onPress={() => { setReplyingId(null); setReplyText(""); }}>إلغاء</Button>
                  </View>
                </View>
              ) : (
                <Button size="sm" variant="outline" onPress={() => setReplyingId(item.id)} style={{ alignSelf: "flex-start", marginTop: 6 }}>
                  رد
                </Button>
              )}
            </View>
          </Card>
        )}
        ListEmptyComponent={loading ? <ActivityIndicator /> : <Text style={{ textAlign: "center", color: theme.mutedForeground }}>{t("common.no_data")}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
});
