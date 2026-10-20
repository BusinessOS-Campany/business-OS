import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Alert, Animated } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../src/lib/theme";
import { I18nProvider, useI18n } from "../src/lib/i18n";
import { AuthProvider, useAuth } from "../src/lib/auth";
import { CartProvider, useCart } from "../src/lib/cart";
import { useRouter, useSegments } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { House, ShoppingBag, Tags, Heart, Package, Search, User, X, Sun, Moon, Languages, LogIn, UserPlus, LogOut, LayoutDashboard } from "lucide-react-native";
import { getScrollY, listen } from "../src/lib/scroll-state";

const TOPBAR_HEIGHT = Platform.OS === "ios" ? 100 : 70;

function TopBar({ scrolled, isTransparent }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const { items } = useCart();
  const { user, logout } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const hide = ["(admin)", "(merchant)", "checkout", "login", "register"].includes(segments[0]);
  if (hide) return null;

  const bgColor = isTransparent ? "transparent" : theme.card;
  const fgColor = isTransparent ? "#ffffff" : theme.foreground;
  const mutedColor = isTransparent ? "rgba(255,255,255,0.7)" : theme.mutedForeground;
  const bdColor = isTransparent ? "transparent" : theme.border;

  function handleLogout() {
    Alert.alert(t("common.logout"), "", [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.logout"), style: "destructive", onPress: () => { logout(); router.replace("/"); } },
    ]);
  }

  return (
    <View style={[styles.topBar, { backgroundColor: bgColor, borderBottomColor: bdColor, position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, elevation: scrolled ? 4 : 0 }]}>
      <TouchableOpacity onPress={() => router.push("/")} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: Platform.OS === "ios" ? 36 : 0 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.primary }}>{t("nav.store_name")}</Text>
      </TouchableOpacity>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <TouchableOpacity onPress={() => setLocale(locale === "ar" ? "en" : "ar")} style={[styles.langBtn, { borderColor: isTransparent ? "rgba(255,255,255,0.3)" : theme.border }]}>
          <Languages size={14} color={mutedColor} />
          <Text style={{ fontSize: 11, fontWeight: "600", color: mutedColor }}>{locale === "ar" ? "EN" : "AR"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleTheme} style={styles.topBtn}>
          {isDark ? <Sun size={18} color={mutedColor} /> : <Moon size={18} color={mutedColor} />}
        </TouchableOpacity>
        {user ? (
          <>
            <TouchableOpacity
              onPress={() => {
                if (user.role === "ADMIN") router.push("/(admin)");
                else if (user.role === "MERCHANT") router.push("/(merchant)");
                else router.push("/favorites");
              }}
              style={[styles.topBtn, { backgroundColor: isTransparent ? "rgba(255,255,255,0.15)" : theme.primary + "15", borderRadius: 8, paddingHorizontal: 8 }]}
            >
              <User size={16} color={isTransparent ? "#fff" : theme.primary} />
              <Text style={{ fontSize: 11, fontWeight: "600", color: isTransparent ? "#fff" : theme.primary, marginLeft: 2 }}>{user.name?.slice(0, 6)}</Text>
            </TouchableOpacity>
            {(user.role === "ADMIN" || user.role === "MERCHANT") && (
              <TouchableOpacity
                onPress={() => router.push(user.role === "ADMIN" ? "/(admin)" : "/(merchant)")}
                style={styles.topBtn}
              >
                <LayoutDashboard size={16} color={mutedColor} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleLogout} style={styles.topBtn}>
              <LogOut size={16} color={mutedColor} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => router.push("/register")} style={styles.topBtn}>
              <UserPlus size={16} color={mutedColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/login")} style={styles.topBtn}>
              <LogIn size={16} color={mutedColor} />
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity onPress={() => router.push("/cart")} style={[styles.topBtn, { position: "relative" }]}>
          <ShoppingBag size={18} color={mutedColor} />
          {items.length > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.primary, top: -4, right: -4 }]}>
              <Text style={[styles.badgeText, { color: theme.primaryForeground }]}>{items.length > 9 ? "9+" : items.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TabBar() {
  const { theme } = useTheme();
  const primary = theme.primary;
  const { t, direction } = useI18n();
  const { items } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const ITEM_W = 62;

  const hideTabs = ["(admin)", "(merchant)", "checkout", "login", "register"].includes(segments[0]);

  const allLinks = [
    { icon: House, labelKey: "nav.home", route: "/" },
    { icon: ShoppingBag, labelKey: "nav.products", route: "/products" },
    { icon: Tags, labelKey: "nav.categories", route: "/categories" },
    { icon: Heart, labelKey: "nav.favorites", route: "/favorites" },
    { icon: Package, labelKey: "track.nav_link", route: "/track" },
  ];

  function getActiveIndex() {
    const path = "/" + segments.filter(s => s !== "(shop)").join("/");
    if (path === "/") return 0;
    for (let i = 1; i < allLinks.length; i++) {
      if (path.startsWith(allLinks[i].route)) return i;
    }
    return -1;
  }

  const activeIndex = getActiveIndex();

  useEffect(() => {
    const pos = 8 + activeIndex * ITEM_W + (ITEM_W - 44) / 2;
    Animated.spring(indicatorAnim, {
      toValue: pos,
      useNativeDriver: false,
      tension: 180,
      friction: 14,
    }).start();
  }, [activeIndex]);

  if (hideTabs) return null;

  function handleSearch() {
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  }

  const [currencyTab, setCurrencyTab] = useState("yer");
  const CURR_CYCLE = ["yer", "usd", "sar"];

  const extraButtons = [
    {
      icon: Search,
      label: t("nav.search"),
      onPress: () => setSearchOpen(true),
    },
    {
      icon: ShoppingBag,
      label: t("nav.cart"),
      onPress: () => router.push("/cart"),
      badge: items.length,
    },
    {
      icon: null,
      label: "$",
      onPress: () => setCurrencyTab((p) => CURR_CYCLE[(CURR_CYCLE.indexOf(p) + 1) % CURR_CYCLE.length]),
    },
    {
      icon: User,
      label: user ? t("nav.account") : t("nav.login"),
      onPress: () => router.push(user ? "/favorites" : "/login"),
    },
  ];

  return (
    <View>
      {searchOpen && (
        <View style={[styles.searchOverlay, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
          <View style={styles.searchRow}>
            <TouchableOpacity onPress={handleSearch} style={{ padding: 8 }}>
              <Search size={20} color={theme.mutedForeground} />
            </TouchableOpacity>
            <TextInput
              style={[styles.searchInput, { color: theme.foreground, borderBottomColor: theme.border }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("nav.search_placeholder") || "بحث عن منتجات..."}
              placeholderTextColor={theme.mutedForeground}
              autoFocus
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity onPress={() => setSearchOpen(false)} style={{ padding: 8 }}>
              <X size={20} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={[styles.bar, { backgroundColor: theme.card, borderTopColor: theme.border, borderTopLeftRadius: 25, borderTopRightRadius: 25, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 }]}>
        <View style={styles.scrollContent}>
          <Animated.View
            style={[
              styles.indicator,
              {
                backgroundColor: primary,
                transform: [{ translateX: indicatorAnim }],
                opacity: 0.18,
              },
            ]}
          />
          {allLinks.map((link, i) => {
            const Icon = link.icon;
            const isActive = i === activeIndex;
            return (
              <TouchableOpacity
                key={link.route}
                onPress={() => router.push(link.route)}
                style={styles.navItem}
              >
                <View style={[styles.iconWrap, isActive && { backgroundColor: "transparent" }]}>
                  <Icon size={22} color={isActive ? primary : theme.mutedForeground} strokeWidth={isActive ? 2.5 : 1.5} />
                </View>
                <Text style={[styles.label, { color: isActive ? primary : theme.mutedForeground }]}>
                  {t(link.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
          {extraButtons.map((btn, i) => {
            const Icon = btn.icon;
            if (Icon === null) {
              return (
                <TouchableOpacity key={i} onPress={btn.onPress} style={styles.navItem}>
                  <View style={[styles.iconWrap, { borderRadius: 4, borderWidth: 1, borderColor: theme.border }]}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: theme.mutedForeground }}>{currencyTab === "yer" ? "ريال" : currencyTab === "usd" ? "$" : "رس"}</Text>
                  </View>
                  <Text style={[styles.label, { color: theme.mutedForeground }]}>{btn.label}</Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity key={i} onPress={btn.onPress} style={styles.navItem}>
                <View style={styles.iconWrap}>
                  <Icon size={22} color={theme.mutedForeground} strokeWidth={1.5} />
                  {btn.badge > 0 && (
                    <View style={[styles.badge, { backgroundColor: primary }]}>
                      <Text style={[styles.badgeText, { color: theme.primaryForeground }]}>{btn.badge > 9 ? "9+" : btn.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.label, { color: theme.mutedForeground }]}>{btn.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function Footer() {
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.muted, paddingVertical: 32, alignItems: "center" }}>
      <Text style={{ fontSize: 14, color: theme.mutedForeground, textAlign: "center" }}>
        {String.fromCharCode(169)} {new Date().getFullYear()} {t("nav.store_name")}. {locale === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}
      </Text>
    </View>
  );
}

function RootLayout() {
  const { isDark } = useTheme();
  const { locale } = useI18n();
  const segments = useSegments();
  const [scrolled, setScrolled] = useState(false);

  const currentPath = "/" + segments.filter((s) => s !== "(shop)").join("/");
  const isHome = currentPath === "/";
  const isTransparent = isHome && !scrolled;

  useEffect(() => {
    setScrolled(getScrollY() > 60);
    return listen((y) => setScrolled(y > 60));
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <TopBar scrolled={scrolled} isTransparent={isTransparent} />
      <View style={{ flex: 1, paddingTop: isHome ? 0 : TOPBAR_HEIGHT }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="products" />
          <Stack.Screen name="products/[slug]" />
          <Stack.Screen name="cart" />
          <Stack.Screen name="checkout" />
          <Stack.Screen name="track" />
          <Stack.Screen name="track/[id]" />
          <Stack.Screen name="favorites" />
          <Stack.Screen name="categories" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(merchant)" />
        </Stack>
      </View>
      <Footer />
      <TabBar />
    </View>
  );
}

export default function AppLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <CartProvider>
              <RootLayout />
            </CartProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: TOPBAR_HEIGHT,
    paddingTop: Platform.OS === "ios" ? 44 : 0,
    borderBottomWidth: 1,
  },
  topBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
  },
  bar: {
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 24 : 6,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 6,
    position: "relative",
    minHeight: 58,
  },
  indicator: {
    position: "absolute",
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 2,
    minWidth: 56,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  searchOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingBottom: Platform.OS === "ios" ? 24 : 6,
    paddingTop: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginHorizontal: 8,
  },
});
