import { useState, useEffect, useRef } from "react";
import { View, Text, Image, TouchableOpacity, Dimensions, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "../../lib/i18n";
import { useTheme } from "../../lib/theme";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function HeroSlider({ slides }) {
  const [current, setCurrent] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const { t, direction, locale } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();
  const timerRef = useRef(null);

  useEffect(() => {
    if (slides.length < 2) return;
    timerRef.current = setInterval(() => {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      setCurrent((p) => (p + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  if (!slides?.length) return null;

  function goTo(i) {
    clearInterval(timerRef.current);
    setCurrent(i);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }

  function prev() { goTo((current - 1 + slides.length) % slides.length); }
  function next() { goTo((current + 1) % slides.length); }

  const s = slides[current];
  const title = locale === "en" ? s.titleEn || s.title : s.title;
  const desc = locale === "en" ? s.descEn || s.desc : s.desc;

  return (
    <View style={{ width, height: 300, overflow: "hidden" }}>
      {slides.map((slide, i) => (
        <Animated.View
          key={slide.id}
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            opacity: i === current ? fadeAnim : 0,
          }}
        >
          <Image source={{ uri: slide.image }} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" }} />
        </Animated.View>
      ))}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: "center", paddingHorizontal: 24 }}>
        <View style={{ maxWidth: 320 }}>
          {title && (
            <Text style={{ fontSize: 28, fontWeight: "800", color: "#fff", marginBottom: 8, textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
              {title}
            </Text>
          )}
          {desc && (
            <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 16, textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
              {desc}
            </Text>
          )}
          <TouchableOpacity
            onPress={() => router.push(s.link || "/products")}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{t("home.shop_now")}</Text>
            {direction === "rtl" && <ChevronLeft size={16} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={prev} style={{ position: "absolute", top: "50%", right: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.2)", justifyContent: "center", alignItems: "center", marginTop: -20 }}>
        <ChevronRight size={20} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity onPress={next} style={{ position: "absolute", top: "50%", left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.2)", justifyContent: "center", alignItems: "center", marginTop: -20 }}>
        <ChevronLeft size={20} color="#fff" />
      </TouchableOpacity>

      <View style={{ position: "absolute", bottom: 16, left: 0, right: 0, zIndex: 10, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }}>
        {slides.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)} style={{ width: i === current ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: i === current ? "#fff" : "rgba(255,255,255,0.5)" }} />
        ))}
      </View>
    </View>
  );
}
