"use client";

import Image from "next/image";
import { Lock } from "lucide-react";
import type { CSSProperties } from "react";
import { LoginForm } from "@/components/login/login-form";
import logoImage from "@/components/brand/celiaLogo.jpg";
import { useLocale } from "@/lib/i18n/locale-provider";

const glassVars = {
  "--card": "rgba(255, 255, 255, 0.12)",
  "--foreground": "rgba(255, 255, 255, 0.95)",
  "--muted-foreground": "rgba(255, 255, 255, 0.7)",
  "--input": "rgba(255, 255, 255, 0.22)",
  "--border": "rgba(255, 255, 255, 0.22)",
  "--ring": "#2dd4bf",
  "--primary": "#14b8a6",
  "--primary-foreground": "#042f2e",
} as CSSProperties;

export default function LoginPage() {
  const { t } = useLocale();
  const currentYear = new Date().getFullYear();

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 sm:px-6">
      <div
        className="absolute inset-0 bg-gradient-to-br from-teal-950 via-slate-950 to-indigo-950"
        aria-hidden="true"
      />
      <div
        className="celia-blob pointer-events-none absolute -top-28 -start-24 size-[30rem] rounded-full bg-teal-400/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="celia-blob-slow pointer-events-none absolute top-1/3 -end-32 size-96 rounded-full bg-indigo-500/30 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="celia-blob pointer-events-none absolute -bottom-36 -start-20 size-[26rem] rounded-full bg-fuchsia-500/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="celia-blob-slow pointer-events-none absolute -top-16 end-1/4 size-72 rounded-full bg-cyan-400/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md">
        <div
          style={glassVars}
          className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-10"
        >
          <div className="mx-auto mb-8 flex size-24 items-center justify-center rounded-full bg-white/10 p-2 shadow-inner ring-1 ring-white/30">
            <Image
              src={logoImage}
              alt={t.brand.logoAlt}
              width={logoImage.width}
              height={logoImage.height}
              className="size-full rounded-full object-contain"
            />
          </div>

          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/50">
              {t.login.title}
            </p>
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{t.login.welcome}</h1>
            <p className="mt-2 text-sm text-white/60">{t.login.subtitle}</p>
          </div>

          <LoginForm />
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-white/50">
          <Lock className="size-3.5" aria-hidden="true" />
          {t.login.secureAccess}
        </p>
      </div>

      <footer className="absolute inset-x-0 bottom-0 z-10 pb-5 text-center text-xs text-white/40">
        {t.login.footer.replace("{year}", String(currentYear))}
      </footer>
    </main>
  );
}
