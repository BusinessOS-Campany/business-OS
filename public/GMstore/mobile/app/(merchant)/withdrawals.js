import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useTheme } from "../../src/lib/theme";
import { useI18n } from "../../src/lib/i18n";
import { api } from "../../src/lib/api";
import { Input } from "../../src/components/ui/Input";
import { Button } from "../../src/components/ui/Button";
import { Card } from "../../src/components/ui/Card";
import { Badge } from "../../src/components/ui/Badge";

export default function MerchantWithdrawalsPage() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState(null);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    api("/merchant/withdrawals").then(setWithdrawals);
    api("/merchant/stats").then(setStats);
  }, []);

  async function handleRequest() {
    await api("/merchant/withdrawals", { method: "POST", body: JSON.stringify({ amount: parseFloat(amount) }) });
    Alert.alert("", "تم إرسال الطلب");
    setAmount("");
    api("/merchant/withdrawals").then(setWithdrawals);
    api("/merchant/stats").then(setStats);
  }

  const balance = stats?.withdrawableBalance ?? 0;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={[styles.title, { color: theme.foreground }]}>طلب سحب</Text>

      <Card style={{ marginBottom: 16, backgroundColor: theme.primary }}>
        <View style={{ padding: 20, alignItems: "center" }}>
          <Text style={{ color: theme.primaryForeground, fontSize: 13, opacity: 0.9 }}>الرصيد القابل للسحب</Text>
          <Text style={{ color: theme.primaryForeground, fontSize: 36, fontWeight: "800", marginTop: 4 }}>
            {balance.toFixed(2)}
          </Text>
          <Text style={{ color: theme.primaryForeground, fontSize: 14, opacity: 0.9 }}>ريال</Text>
        </View>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <View style={{ padding: 16, gap: 8 }}>
          <Input label="المبلغ" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <Button onPress={handleRequest}>طلب سحب</Button>
        </View>
      </Card>

      <Text style={{ fontSize: 15, fontWeight: "700", color: theme.foreground, marginBottom: 8 }}>سجل السحوبات</Text>

      <FlatList
        data={withdrawals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 8 }}>
            <View style={{ padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: theme.foreground, fontWeight: "600" }}>{Number(item.amount).toFixed(2)} ريال</Text>
              <Badge label={item.status} variant={item.status === "COMPLETED" ? "success" : "warning"} />
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
});
