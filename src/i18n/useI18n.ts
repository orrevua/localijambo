import { use } from 'react';
import { I18nContext } from './I18nContext.ts';

export function useI18n() {
  const value = use(I18nContext);
  if (!value) throw new Error('useI18n must be used within an I18nProvider');
  return value;
}
