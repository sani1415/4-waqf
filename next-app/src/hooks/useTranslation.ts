'use client';

import { useState, useEffect, useCallback } from 'react';
import enMessages from '@/messages/en.json';
import bnMessages from '@/messages/bn.json';

const messages: Record<string, Record<string, string>> = {
  en: enMessages,
  bn: bnMessages
};

export function useTranslation() {
  const [lang, setLang] = useState<'en' | 'bn'>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('waqf_lang');
    if (savedLang === 'bn' || savedLang === 'en') {
      setLang(savedLang);
    }
  }, []);

  const changeLang = useCallback((newLang: 'en' | 'bn') => {
    setLang(newLang);
    localStorage.setItem('waqf_lang', newLang);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let text = messages[lang]?.[key] || messages['en']?.[key] || key;
    
    // Handle interpolation like {count}
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
      });
    }
    
    return text;
  }, [lang]);

  return { t, lang, changeLang };
}
