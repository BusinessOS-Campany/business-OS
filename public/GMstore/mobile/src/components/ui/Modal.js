import { Modal as RNModal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../../lib/theme";

export function Modal({ open, onClose, title, children }) {
  const { theme } = useTheme();

  return (
    <RNModal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.content, { backgroundColor: theme.card }]}>
          {title && <Text style={[styles.title, { color: theme.foreground }]}>{title}</Text>}
          {children}
        </TouchableOpacity>
      </TouchableOpacity>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  content: { borderRadius: 16, padding: 20 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
});
