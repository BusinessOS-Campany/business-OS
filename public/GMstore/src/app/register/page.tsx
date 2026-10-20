"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/config").then((r) => r.json()).then((d) => setGoogleEnabled(d.googleEnabled)).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      role: form.get("role"),
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email: body.email,
      password: body.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Account created but login failed");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Store className="mx-auto h-10 w-10 text-primary mb-2" />
          <CardTitle>{t("auth.register")}</CardTitle>
        </CardHeader>
        <CardContent>
          {googleEnabled && (
            <>
              <Button variant="outline" className="w-full" onClick={handleGoogle} loading={googleLoading}>
                <svg className="ml-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {t("auth.google_signin")}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">{t("auth.or")}</span></div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input id="name" name="name" label={t("auth.name")} required />
            <Input id="email" name="email" type="email" label={t("auth.email")} required />
            <Input id="password" name="password" type="password" label={t("auth.password")} required />
            <div className="space-y-1">
              <label htmlFor="role" className="text-sm font-medium">{t("auth.select_role")}</label>
              <select id="role" name="role" className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="CUSTOMER">{t("auth.customer")}</option>
                <option value="MERCHANT">{t("auth.merchant")}</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              <UserPlus className="ml-2 h-4 w-4" /> {t("auth.register_btn")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("auth.have_account")}{" "}
            <a href="/login" className="text-primary hover:underline">{t("auth.login_link")}</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
