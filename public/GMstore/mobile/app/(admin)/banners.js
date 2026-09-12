import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, Switch } from "react-native";
import { useTheme } from "../../src/lib/theme";
import { useI18n } from "../../src/lib/i18n";
import { api } from "../../src/lib/api";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { Badge } from "../../src/components/ui/Badge";

export default function AdminBannersPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState("");
  const [link, setLink] = useState("");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchBanners = () => {
    setLoading(true);
    api("/banners").then((data) => {
      setBanners(data || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleAdd = async () => {
    if (!image.trim()) {
      Alert.alert(t("common.error"), t("common.fill_required"));
      return;
    }
    setSubmitting(true);
    try {
      await api("/banners", {
        method: "POST",
        body: JSON.stringify({ image: image.trim(), link: link.trim() || undefined, active }),
      });
      setImage("");
      setLink("");
      setActive(true);
      fetchBanners();
    } catch (e) {
      Alert.alert(t("common.error"), e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(t("common.confirm"), t("common.delete") + "?", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"), style: "destructive", onPress: async () => {
          try {
            await api(`/banners/${id}`, { method: "DELETE" });
            fetchBanners();
          } catch (e) {
            Alert.alert(t("common.error"), e.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onLongPress={() => handleDelete(item.id)}>
      <Card style={{ marginBottom: 8 }}>
        <View style={{ padding: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
          {item.image && (
            <Image source={{ uri: item.image }} style={{ width: 64, height: 48, borderRadius: 6, backgroundColor: theme.border }} />
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Badge label={item.active ? "Active" : "Inactive"} variant={item.active ? "success" : "outline"} />
            {item.link && <Text style={{ color: theme.mutedForeground, fontSize: 11 }} numberOfLines={1}>{item.link}</Text>}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={[styles.title, { color: theme.foreground }]}>{t("admin.banners")}</Text>

      <Card style={{ marginBottom: 16 }}>
        <View style={{ padding: 12, gap: 8 }}>
          <Input label="Image URL" value={image} onChangeText={setImage} placeholder="https://..." />
          <Input label="Link URL" value={link} onChangeText={setLink} placeholder="https://..." />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, fontWeight: "500", color: theme.foreground }}>Active</Text>
            <Switch
              value={active}
              onValueChange={setActive}
              thumbColor={active ? theme.primary : theme.border}
              trackColor={{ false: theme.border, true: theme.primary + "40" }}
            />
          </View>
          <Button onPress={handleAdd} loading={submitting}>{t("common.save")}</Button>
        </View>
      </Card>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={banners}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={{ textAlign: "center", color: theme.mutedForeground, marginTop: 40 }}>{t("common.no_data")}</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
});
