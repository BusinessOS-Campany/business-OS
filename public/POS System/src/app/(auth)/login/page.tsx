"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Eye, EyeOff, Languages, Loader2, Monitor, Moon, Package, Store, Sun, ShoppingCart, BarChart3, Wifi, Landmark } from "lucide-react";
import { useLang } from "@/i18n/LanguageProvider";
import type { Locale } from "@/i18n/dictionary";
import { useAuthStore } from "@/store/auth";

type LoginErrorKey = "invalid_credentials" | "account_suspended";

export default function LoginPage() {
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const { theme, setTheme } = useTheme();
  const setSession = useAuthStore((s) => s.setSession);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<LoginErrorKey | null>(null);

  useEffect(() => {
    document.title = t("app.name");
  }, [t]);

  async function submit(ident: string, pw: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/pos/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: ident, password: pw }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const key = json.error === "account_suspended" ? "account_suspended" : "invalid_credentials";
        setError(key);
        return;
      }
      setSession({
        user: json.data.user,
        company: json.data.company,
        permissions: json.data.permissions,
        loaded: true,
      });
      router.push("/");
      router.refresh();
    } catch {
      setError("invalid_credentials");
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier || !password || submitting) return;
    void submit(identifier, password);
  }

  function onFillDemo() {
    setIdentifier("demo");
    setPassword("demo123");
    void submit("demo", "demo123");
  }

  const features = [
    { icon: ShoppingCart, label: lang === "ar" ? "نقاط بيع سريعة وماسح باركود" : "Fast POS with barcode scanning" },
    { icon: BarChart3, label: lang === "ar" ? "تقارير وتحليلات لحظية" : "Real-time reports & analytics" },
    { icon: Wifi, label: lang === "ar" ? "يعمل دون اتصال ثم يزامن" : "Works offline then syncs" },
    { icon: Landmark, label: lang === "ar" ? "محاسبة وذمم مدمجة" : "Built-in accounting & credit" },
  ];

  const switchLang = (l: Locale) => setLang(l);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-950 lg:flex lg:flex-col lg:justify-between lg:p-12 dark:from-emerald-900 dark:via-emerald-950 dark:to-slate-950">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25) 0, transparent 45%), radial-gradient(circle at 80% 70%, rgba(45,212,191,0.4) 0, transparent 40%)",
        }} />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Store className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">{t("app.name")}</p>
            <p className="text-sm text-emerald-200">{t("app.tagline")}</p>
          </div>
        </div>

        <div className="relative">
          <h1 className="text-4xl font-extrabold leading-tight text-white">
            {lang === "ar"
              ? "أدار مشروعك التجاري بكل سهولة"
              : "Run your business with ease"}
          </h1>
          <p className="mt-4 max-w-md text-emerald-100/90">
            {lang === "ar"
              ? "منصة نقاط بيع متكاملة للأسواق اليمنية تدعم العملات المتعددة، وتعمل دون اتصال، وتناسب المتاجر والمطاعم ومحلات الجملة."
              : "A complete point of sale platform for Yemeni markets with multi-currency, offline capability, built for shops, restaurants, and wholesalers."}
          </p>
          <ul className="mt-8 space-y-4">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                  <f.icon className="h-4.5 w-4.5 text-emerald-200" />
                </span>
                <span className="text-sm font-medium text-white/95">{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-emerald-200/70">
          © {new Date().getFullYear()} {t("app.name")} · {lang === "ar" ? "صنع في اليمن" : "Made in Yemen"}
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-10 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => switchLang(lang === "ar" ? "en" : "ar")}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-muted/50"
            >
              <Languages className="h-4 w-4" />
              {lang === "ar" ? "English" : "العربية"}
            </button>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-muted/50"
              aria-label={t("settings.theme")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold">{t("app.name")}</p>
              <p className="text-sm text-muted-foreground">{t("app.tagline")}</p>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight">{t("auth.welcomeBack")}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium">
                {t("auth.username")}
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
                placeholder={t("auth.username")}
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                {t("auth.password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 end-3 flex items-center text-muted-foreground transition hover:text-foreground"
                  aria-label="toggle"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {t(`auth.${error}`)}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !identifier || !password}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? t("auth.signingIn") : t("auth.signIn")}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {t("auth.demoCredentials")}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("auth.demoUser")}</p>
            <button
              type="button"
              onClick={onFillDemo}
              disabled={submitting}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-600/40 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-600/10 disabled:opacity-50 dark:text-emerald-400"
            >
              <Package className="h-3.5 w-3.5" />
              {lang === "ar" ? "تجربة فورية" : "Try instantly"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}