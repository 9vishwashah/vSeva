import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { Lang, translations } from '../i18n/translations';
import { toLocaleDigits } from '../i18n/digits';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  // Looks up `key` in the active language's dictionary, falling back to
  // English (then the key itself) so a missing translation never renders
  // blank.
  t: (key: string) => string;
  // Formats a number/string of digits in the active language's native
  // script (Devanagari for Hindi, Gujarati digits for Gujarati); English
  // passes the value through unchanged.
  n: (value: number | string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'vseva_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'gu' || stored === 'hi') return stored;
    } catch {
      // ignore — defaults to English
    }
    return 'en';
  });

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // per-device convenience only, not required to persist
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key: string) => {
    return translations[lang][key] ?? translations.en[key] ?? key;
  }, [lang]);

  const n = useCallback((value: number | string) => toLocaleDigits(value, lang), [lang]);

  const value = useMemo(() => ({ lang, setLang, t, n }), [lang, setLang, t, n]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
