"use client";
import { useState, useEffect } from "react";
import { Wallet, Plus, Banknote, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/provider";

interface Withdrawal {
  id: string;
  amount: number;
  method: string;
  accountInfo: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function MerchantWithdrawalsPage() {
  const { t, direction } = useI18n();
  const statusConfig: Record<string, { label: string; variant: "warning" | "success" | "danger" | "default"; icon: typeof Clock }> = {
    PENDING: { label: t("merchant.status_PENDING"), variant: "warning", icon: Clock },
    APPROVED: { label: t("merchant.status_APPROVED"), variant: "success", icon: CheckCircle },
    REJECTED: { label: t("merchant.status_REJECTED"), variant: "danger", icon: XCircle },
  };
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bank Transfer");
  const [accountInfo, setAccountInfo] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/merchant/withdrawals").then((r) => r.json()),
      fetch("/api/merchant/stats").then((r) => r.json()),
    ])
      .then(([wdData, statsData]) => {
        setWithdrawals(wdData.withdrawals || wdData || []);
        setBalance(statsData.withdrawableBalance ?? 0);
        setLoading(false);
      })
      .catch(() => {
        setMessage({ type: "error", text: t("merchant.load_error") });
        setLoading(false);
      });
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/merchant/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), method, accountInfo }),
      });
      if (!res.ok) throw new Error("Failed");
      const newWd = await res.json();
      setWithdrawals((prev) => [newWd, ...prev]);
      setAmount("");
      setAccountInfo("");
      setMessage({ type: "success", text: t("merchant.withdraw_requested") });
    } catch {
      setMessage({ type: "error", text: t("merchant.withdraw_error") });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div dir={direction} className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div dir={direction} className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          {t("merchant.withdrawals")}
        </h1>
      </div>

      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <Banknote className="h-8 w-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">{t("merchant.withdrawable_balance")}</p>
            <p className="text-2xl font-bold">{Number(balance).toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t("merchant.new_withdrawal")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t("merchant.amount")}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">{t("merchant.method")}</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              >
                <option value="Bank Transfer">{t("merchant.bank_transfer")}</option>
                <option value="PayPal">PayPal</option>
                <option value="Wallet">{t("merchant.wallet")}</option>
              </select>
            </div>
            <Input
              label={t("merchant.account_info")}
              value={accountInfo}
              onChange={(e) => setAccountInfo(e.target.value)}
              required
            />
            <Button type="submit" loading={submitting} disabled={submitting}>
              <Plus className="h-4 w-4 ms-2" />
              {t("merchant.request_withdrawal")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("merchant.withdrawal_history")}</CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t("merchant.no_withdrawals")}</p>
          ) : (
            <div className="divide-y divide-border">
              {withdrawals.map((wd) => {
                const cfg = statusConfig[wd.status] || statusConfig.PENDING;
                const StatusIcon = cfg.icon;
                return (
                  <div key={wd.id} className="flex items-center justify-between py-4">
                    <div className="space-y-1">
                      <p className="font-medium">{Number(wd.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {wd.method} &middot; {formatDate(wd.createdAt)}
                      </p>
                      {wd.accountInfo && (
                        <p className="text-xs text-muted-foreground">{wd.accountInfo}</p>
                      )}
                    </div>
                    <Badge variant={cfg.variant}>
                      <StatusIcon className="h-3 w-3 me-1" />
                      {cfg.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
