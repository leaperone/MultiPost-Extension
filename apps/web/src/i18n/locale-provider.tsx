import { createContext, useContext } from 'react';
import { FALLBACK_LOCALE, type Locales } from './settings';

const Context = createContext<Locales>(FALLBACK_LOCALE);

export function LocaleProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: Locales;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLocale() {
  return useContext(Context);
}
