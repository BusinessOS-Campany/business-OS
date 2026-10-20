import { View, Text, TextInput } from "react-native";
import { useTheme } from "../../lib/theme";

export function Input({ label, value, onChangeText, error, ...props }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      {label && <Text style={{ fontSize: 13, fontWeight: "500", color: theme.foreground }}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={theme.mutedForeground}
        style={{
          borderWidth: 1,
          borderColor: error ? theme.destructive : theme.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: theme.foreground,
        }}
        {...props}
      />
      {error && <Text style={{ fontSize: 11, color: theme.destructive }}>{error}</Text>}
    </View>
  );
}
