import { createContext } from 'react';
import type { Lang, Messages } from './messages.ts';

export interface I18nValue {
  lang: Lang;
  /** BCP 47 locale for dates/numbers (e.g. 'pt-BR'). */
  locale: string;
  t: Messages;
  setLang: (lang: Lang) => void;
}

export const I18nContext = createContext<I18nValue | null>(null);
