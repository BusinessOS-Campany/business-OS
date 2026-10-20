"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Locale } from "./dictionary";
import { translate } from "./dictionary";

export type { Locale } from "./dictionary";
export const LANG_COOKIE = "pos_lang";

interface LangCtxValue {
  lang: Locale;
  setLang: (l: Locale) => void;
  t: (key: string) => string;
}

const LangCtx = createContext<LangCtxValue>({
  lang: "ar",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children, lang: initial }: { children: ReactNode; lang: Locale }) {
  const [lang, setLangState] = useState<Locale>(initial);

  useEffect(() => {
    const saved = localStorage.getItem("pos_lang");
    if (saved === "ar" || saved === "en") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("pos_lang", lang);
  }, [lang]);

  const setLang = useCallback((l: Locale) => {
    setLangState(l);
    document.cookie = `${LANG_COOKIE}=${l};path=/;max-age=31536000;samesite=lax`;
    window.dispatchEvent(new CustomEvent("pos:lang", { detail: l }));
  }, []);

  const t = useCallback((key: string) => translate(lang, key), [lang]);

  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export function useLang(): LangCtxValue {
  return useContext(LangCtx);
}

export function isRtl(lang: Locale): boolean {
  return lang === "ar";
}