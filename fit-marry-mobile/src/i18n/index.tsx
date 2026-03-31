import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { I18nManager } from 'react-native';
import { getItem, setItem } from '../utils/storage';
import ar from './ar';
import en from './en';

type DeepStringify<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};
type Translations = DeepStringify<typeof ar>;
type Language = 'ar' | 'en';

interface I18nContextType {
  lang: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
}

const translations: Record<Language, Translations> = { ar, en };

const I18nContext = createContext<I18nContextType>({
  lang: 'ar',
  t: ar,
  setLanguage: () => {},
  isRTL: true,
});

const LANG_KEY = 'app_language';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('ar');

  useEffect(() => {
    getItem(LANG_KEY).then((saved) => {
      if (saved === 'en' || saved === 'ar') {
        setLang(saved);
        const shouldBeRTL = saved === 'ar';
        if (I18nManager.isRTL !== shouldBeRTL) {
          I18nManager.allowRTL(shouldBeRTL);
          I18nManager.forceRTL(shouldBeRTL);
        }
      }
    });
  }, []);

  const setLanguage = useCallback((newLang: Language) => {
    setLang(newLang);
    setItem(LANG_KEY, newLang);
    const shouldBeRTL = newLang === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
    }
  }, []);

  const value: I18nContextType = {
    lang,
    t: translations[lang],
    setLanguage,
    isRTL: lang === 'ar',
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
