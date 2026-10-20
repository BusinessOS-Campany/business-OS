import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import en from '../locales/en.json';
import ar from '../locales/ar.json';

export interface Language {
  code: string;
  label: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
];

type Locale = 'en' | 'ar';

interface LanguageContextType {
  locale: Locale;
  lang: Language;
  dir: 'ltr' | 'rtl';
  setLanguage: (code: string) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const translations: Record<Locale, Record<string, string>> = { en, ar };

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(
    (localStorage.getItem('locale') as Locale) || 'en'
  );

  useEffect(() => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [locale]);

  const setLanguage = useCallback((code: string) => {
    if (code === 'en' || code === 'ar') {
      setLocale(code);
      localStorage.setItem('locale', code);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLocale(prev => {
      const next = prev === 'en' ? 'ar' : 'en';
      localStorage.setItem('locale', next);
      return next;
    });
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let text = translations[locale][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, [locale]);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const lang = LANGUAGES.find(l => l.code === locale)!;

  return (
    <LanguageContext.Provider value={{ locale, lang, dir, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
