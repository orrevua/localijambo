import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { I18nContext } from './I18nContext.ts';
import type { I18nValue } from './I18nContext.ts';
import { LANGS, MESSAGES } from './messages.ts';
import type { Lang } from './messages.ts';

const STORAGE_KEY = 'localijambo:lang';
const DEFAULT_LANG: Lang = 'pt';

function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'pt' || stored === 'en') return stored;
  } catch {
    // storage blocked — fall back to the default
  }
  return DEFAULT_LANG;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // not persisted; still applies for this session
    }
  }, []);

  const locale = LANGS.find((l) => l.value === lang)!.locale;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nValue>(
    () => ({ lang, locale, t: MESSAGES[lang], setLang }),
    [lang, locale, setLang],
  );

  return <I18nContext value={value}>{children}</I18nContext>;
}
