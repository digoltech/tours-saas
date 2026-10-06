"use client";

import { useRouter } from "next/navigation";
import { Globe2 } from "lucide-react";
import { languageNames, locales, type Locale } from "./dictionaries";
import { useLocale, useTranslations } from "./LocaleProvider";

export function LanguageSelector({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations();
  const router = useRouter();

  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `digol_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    document.documentElement.lang = next;
    router.refresh();
  }

  return <label className={`language-selector ${className}`}>
    <Globe2 size={16} aria-hidden="true" />
    <span className="sr-only">{t("Language")}</span>
    <select aria-label={t("Language")} value={locale} onChange={(event) => choose(event.target.value as Locale)}>
      {locales.map((item) => <option value={item} key={item}>{languageNames[item]}</option>)}
    </select>
  </label>;
}
