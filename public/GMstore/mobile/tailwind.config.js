/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#F8F9FA",
        foreground: "#1F2937",
        primary: "#EA580C",
        "primary-foreground": "#ffffff",
        accent: "#EA580C",
        "accent-foreground": "#ffffff",
        muted: "#FFFFFF",
        "muted-foreground": "#6B7280",
        border: "#E5E7EB",
        card: "#FFFFFF",
        "card-foreground": "#1F2937",
        destructive: "#EF4444",
        success: "#22C55E",
        warning: "#EAB308",
        dark: {
          background: "#0F172A",
          foreground: "#F8FAFC",
          primary: "#F97316",
          muted: "#1E293B",
          "muted-foreground": "#CBD5E1",
          border: "#334155",
          card: "#1E293B",
          "card-foreground": "#F8FAFC",
        },
      },
      borderRadius: {
        lg: "8px",
        xl: "12px",
        full: "9999px",
      },
      fontFamily: {
        sans: ["Geist Sans"],
        mono: ["Geist Mono"],
      },
    },
  },
  plugins: [],
};
