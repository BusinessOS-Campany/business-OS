import { View } from "react-native";
import { useTheme } from "../../lib/theme";

export function Card({ children, style, ...props }) {
  const { theme } = useTheme();
  return (
    <View style={[{ backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border }, style]} {...props}>
      {children}
    </View>
  );
}
