import { getBrowserLocale } from "./errors";
import { useLocale } from "./LocaleProvider";

export function getFormattingLocale() {
  return `${getBrowserLocale()}-IN`;
}

export function formatDecimal(value: number, fractionDigits = 2) {
  return new Intl.NumberFormat(getFormattingLocale(), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function useFormattingLocale() {
  return `${useLocale()}-IN`;
}

export function useFormatDecimal() {
  const locale = useFormattingLocale();
  return (value: number, fractionDigits = 2) => new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
