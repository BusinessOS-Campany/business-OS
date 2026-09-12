import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const colors = {
  background: "#F8F9FA",
  foreground: "#1F2937",
  primary: "#EA580C",
  primaryForeground: "#ffffff",
  accent: "#EA580C",
  accentForeground: "#ffffff",
  muted: "#FFFFFF",
  mutedForeground: "#6B7280",
  border: "#E5E7EB",
  card: "#FFFFFF",
  cardForeground: "#1F2937",
  destructive: "#EF4444",
  success: "#22C55E",
  warning: "#EAB308",
};

const darkColors = {
  background: "#0F172A",
  foreground: "#F8FAFC",
  primary: "#F97316",
  primaryForeground: "#ffffff",
  accent: "#F97316",
  accentForeground: "#ffffff",
  muted: "#1E293B",
  mutedForeground: "#CBD5E1",
  border: "#334155",
  card: "#1E293B",
  cardForeground: "#F8FAFC",
  destructive: "#EF4444",
  success: "#22C55E",
  warning: "#EAB308",
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("theme").then((v) => { if (v === "dark") setIsDark(true); });
  }, []);

  const theme = isDark ? darkColors : colors;

  function toggleTheme() {
    setIsDark((p) => {
      const next = !p;
      AsyncStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }

  return <ThemeContext.Provider value={{ isDark, theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
