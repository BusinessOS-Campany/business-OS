import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from "react-native";
import { useTheme } from "../../src/lib/theme";
import { useI18n } from "../../src/lib/i18n";
import { api } from "../../src/lib/api";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";

export default function AdminCategoriesPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [image, setImage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = () => {
    setLoading(true);
    api("/categories").then((data) => {
      setCategories(data || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleAdd = async () => {
    if (!name.trim() && !nameAr.trim()) {
      Alert.alert(t("common.error"), t("common.fill_required"));
      return;
    }
    setSubmitting(true);
    try {
      await api("/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), nameAr: nameAr.trim(), image: image.trim() || undefined }),
      });
      setName("");
      setNameAr("");
      setImage("");
      fetchCategories();
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
            await api(`/categories/${id}`, { method: "DELETE" });
            fetchCategories();
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
            <Image source={{ uri: item.image }} style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: theme.border }} />
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: theme.foreground, fontWeight: "600" }}>{item.nameAr || item.name}</Text>
            {(item.name && item.nameAr) && <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{item.name}</Text>}
            <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>{item.productCount ?? item._count?.products ?? 0} {t("common.products")}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={[styles.title, { color: theme.foreground }]}>{t("admin.categories")}</Text>

      <Card style={{ marginBottom: 16 }}>
        <View style={{ padding: 12, gap: 8 }}>
          <Input label="Name (English)" value={name} onChangeText={setName} placeholder="Category name" />
          <Input label="Name (Arabic)" value={nameAr} onChangeText={setNameAr} placeholder="اسم القسم" />
          <Input label="Image URL" value={image} onChangeText={setImage} placeholder="https://..." />
          <Button onPress={handleAdd} loading={submitting}>{t("common.save")}</Button>
        </View>
      </Card>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={categories}
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
