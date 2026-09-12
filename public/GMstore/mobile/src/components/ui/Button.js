import { TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { useTheme } from "../../lib/theme";

const sizes = {
  sm: { py: 8, px: 12, fs: 13 },
  md: { py: 10, px: 16, fs: 14 },
  lg: { py: 14, px: 20, fs: 16 },
};

export function Button({ children, onPress, variant = "primary", size = "md", loading, disabled, style, icon, ...props }) {
  const { theme } = useTheme();
  const variants = {
    primary: { bg: theme.primary, text: theme.primaryForeground },
    secondary: { bg: theme.card, text: theme.cardForeground, border: theme.border },
    outline: { bg: "transparent", text: theme.foreground, border: theme.border },
    ghost: { bg: "transparent", text: theme.foreground },
    danger: { bg: theme.destructive, text: theme.primaryForeground },
  };
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[{
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        borderRadius: 8, paddingVertical: s.py, paddingHorizontal: s.px,
        backgroundColor: isDisabled ? theme.border : v.bg,
        borderWidth: v.border ? 1 : 0, borderColor: v.border,
        opacity: isDisabled ? 0.6 : 1,
      }, style]}
      {...props}
    >
      {loading ? <ActivityIndicator size="small" color={v.text} /> : icon}
      {children && <Text style={{ color: isDisabled ? theme.mutedForeground : v.text, fontSize: s.fs, fontWeight: "600" }}>{children}</Text>}
    </TouchableOpacity>
  );
}
