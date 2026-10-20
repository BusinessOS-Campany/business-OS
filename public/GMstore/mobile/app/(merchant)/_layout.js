import { useEffect, useRef, useState } from "react";
import { Stack } from "expo-router";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Modal, Dimensions, Platform } from "react-native";
import { useTheme } from "../../src/lib/theme";
import { useI18n } from "../../src/lib/i18n";
import { useAuth } from "../../src/lib/auth";
import { useRouter, useSegments } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;

const links = [
  { icon: (p) => <Ionicons name="grid-outline" size={20} {...p} />, labelKey: "merchant.dashboard", route: "/(merchant)" },
  { icon: (p) => <Ionicons name="cart-outline" size={20} {...p} />, labelKey: "merchant.orders", route: "/(merchant)/orders" },
  { icon: (p) => <Ionicons name="storefront-outline" size={20} {...p} />, labelKey: "merchant.store_settings", route: "/(merchant)/store" },
  { icon: (p) => <Ionicons name="star-outline" size={20} {...p} />, labelKey: "merchant.reviews", route: "/(merchant)/reviews" },
  { icon: (p) => <Ionicons name="wallet-outline" size={20} {...p} />, labelKey: "merchant.withdrawals", route: "/(merchant)/withdrawals" },
  { icon: (p) => <Ionicons name="settings-outline" size={20} {...p} />, labelKey: "merchant.account_settings", route: "/(merchant)/settings" },
];

export default function MerchantLayout() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "MERCHANT")) {
      router.replace("/login");
    }
  }, [user, authLoading]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [segments]);

  if (authLoading || !user || user.role !== "MERCHANT") {
    return <ActivityIndicator style={{ marginTop: 100 }} size="large" color={theme.primary} />;
  }

  function getActiveIndex() {
    const joined = segments.join("/");
    for (let i = 0; i < links.length; i++) {
      const linkPath = links[i].route.replace("/(merchant)", "").replace("/", "");
      if (joined === linkPath || (linkPath === "" && joined === "index")) return i;
    }
    return 0;
  }

  const activeIndex = getActiveIndex();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Top bar with hamburger and title */}
      <View style={[styles.topBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.hamburger}>
          <Ionicons name="menu-outline" size={24} color={theme.foreground} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: theme.primary }]}>{t("merchant.dashboard")}</Text>
        <TouchableOpacity onPress={() => router.push("/")} style={styles.hamburger}>
          <Ionicons name="storefront-outline" size={22} color={theme.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Drawer overlay */}
      <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} onPress={() => setDrawerOpen(false)} />
          <View style={[styles.drawer, { backgroundColor: theme.card }]}>
            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerBrand, { color: theme.primary }]}>{t("merchant.dashboard")}</Text>
              <TouchableOpacity onPress={() => setDrawerOpen(false)}>
                <Ionicons name="close-outline" size={24} color={theme.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.drawerLinks}>
              {links.map((link) => {
                const active = links.indexOf(link) === activeIndex;
                return (
                  <TouchableOpacity
                    key={link.route}
                    onPress={() => { setDrawerOpen(false); router.push(link.route); }}
                    style={[styles.drawerLink, active && { backgroundColor: theme.primary + "15" }]}
                  >
                    <link.icon color={active ? theme.primary : theme.mutedForeground} />
                    <Text style={[styles.drawerLinkText, { color: active ? theme.primary : theme.foreground }, active && { fontWeight: "700" }]}>
                      {t(link.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={[styles.drawerFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity onPress={() => router.push("/")} style={styles.drawerLink}>
                <Ionicons name="arrow-back-outline" size={20} color={theme.mutedForeground} />
                <Text style={{ color: theme.mutedForeground, fontSize: 14 }}>{t("nav.back_to_shop")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Stack content */}
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="orders" />
          <Stack.Screen name="store" />
          <Stack.Screen name="reviews" />
          <Stack.Screen name="withdrawals" />
          <Stack.Screen name="settings" />
        </Stack>
      </View>

      {/* Bottom nav bar */}
      <View style={[styles.bottomNav, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomNavContent}>
          {links.slice(0, 5).map((link, i) => {
            const active = i === activeIndex;
            return (
              <TouchableOpacity
                key={link.route}
                onPress={() => router.push(link.route)}
                style={styles.bottomNavItem}
              >
                <View style={[styles.bottomIconWrap, active && { backgroundColor: theme.primary + "20" }]}>
                  <link.icon color={active ? theme.primary : theme.mutedForeground} />
                </View>
                <Text style={[styles.bottomLabel, { color: active ? theme.primary : theme.mutedForeground }]}>
                  {t(link.labelKey).substring(0, 8)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  hamburger: { padding: 4 },
  topTitle: { fontSize: 16, fontWeight: "700" },
  drawerOverlay: { flex: 1, flexDirection: "row" },
  drawerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  drawer: {
    width: Math.min(SCREEN_WIDTH * 0.75, 280),
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  drawerBrand: { fontSize: 18, fontWeight: "700" },
  drawerLinks: { flex: 1 },
  drawerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  drawerLinkText: { fontSize: 14, fontWeight: "500" },
  drawerFooter: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
  },
  bottomNav: {
    borderTopWidth: 1,
    paddingVertical: 6,
    paddingBottom: Platform.OS === "ios" ? 24 : 6,
  },
  bottomNavContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  bottomNavItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 2,
    minWidth: 56,
  },
  bottomIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
});
