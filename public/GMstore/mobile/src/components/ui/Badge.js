import { View, Text } from "react-native";
import { useTheme } from "../../lib/theme";

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function Badge({ label, variant = "default", style }) {
  const { theme } = useTheme();
  const variants = {
    default: { bg: hexToRgba(theme.primary, 0.1), text: theme.primary },
    success: { bg: hexToRgba(theme.success, 0.1), text: theme.success },
    warning: { bg: hexToRgba(theme.warning, 0.1), text: theme.warning },
    danger: { bg: hexToRgba(theme.destructive, 0.1), text: theme.destructive },
    outline: { bg: "transparent", text: theme.mutedForeground, border: theme.border },
  };
  const v = variants[variant] || variants.default;
  return (
    <View style={[{
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: v.bg,
      borderWidth: v.border ? 1 : 0,
      borderColor: v.border,
    }, style]}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: v.text }}>{label}</Text>
    </View>
  );
}
