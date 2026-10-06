"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { formatLocalizedDate, formatLocalizedNumber, translate, type Locale } from "./dictionaries";

const LocaleContext = createContext<Locale>("en");
const localizedAttributes = ["aria-label", "title", "placeholder", "alt"] as const;

function LocalizedAttributes({ locale }: { locale: Locale }) {
  useEffect(() => {
    function localize(element: Element) {
      for (const name of localizedAttributes) {
        const value = element.getAttribute(name);
        if (!value) continue;
        const sourceAttribute = `data-i18n-source-${name.replaceAll("-", "")}`;
        let source = element.getAttribute(sourceAttribute);
        if (!source || !(["en", "hi", "gu"] as const).some((candidate) => translate(candidate, source ?? "") === value)) {
          source = value;
          element.setAttribute(sourceAttribute, source);
        }
        const translated = translate(locale, source);
        if (translated !== value) element.setAttribute(name, translated);
      }
    }
    function scan(root: Element) {
      localize(root);
      root.querySelectorAll("[aria-label], [title], [placeholder], [alt]").forEach(localize);
    }
    scan(document.body);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes") localize(record.target as Element);
        else for (const node of record.addedNodes) if (node instanceof Element) scan(node);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: [...localizedAttributes] });
    return () => observer.disconnect();
  }, [locale]);
  return null;
}

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}><LocalizedAttributes locale={locale} />{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useTranslations() {
  const locale = useLocale();
  return (key: string) => translate(locale, key);
}

export function useLocaleFormat() {
  const locale = useLocale();
  return {
    date: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => formatLocalizedDate(locale, value, options),
    number: (value: number, options?: Intl.NumberFormatOptions) => formatLocalizedNumber(locale, value, options),
  };
}
