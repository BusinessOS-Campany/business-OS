import { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { useTheme } from "../../lib/theme";

export default function CountdownTimer({ target }) {
  const { theme } = useTheme();
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function calc() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setRemaining("00:00:00"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (!remaining) return null;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.destructive + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: theme.destructive, fontVariant: ["tabular-nums"] }}>
        {remaining}
      </Text>
    </View>
  );
}
