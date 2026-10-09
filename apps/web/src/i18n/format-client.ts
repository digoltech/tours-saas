import { getBrowserLocale } from "./errors";
import { useLocale } from "./LocaleProvider";

export function getFormattingLocale() {
  return `${getBrowserLocale()}-IN`;
}

const numberFormatters = new Map<string, Intl.NumberFormat>();
function decimalFormatter(locale: string, fractionDigits: number) {
  const key = `${locale}:${fractionDigits}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    if (numberFormatters.size >= 30) numberFormatters.clear();
    numberFormatters.set(key, formatter);
  }
  return formatter;
}
export function formatDecimal(value: number, fractionDigits = 2) {
  return decimalFormatter(getFormattingLocale(), fractionDigits).format(value);
}

export function useFormattingLocale() {
  return `${useLocale()}-IN`;
}

export function useFormatDecimal() {
  const locale = useFormattingLocale();
  return (value: number, fractionDigits = 2) =>
    decimalFormatter(locale, fractionDigits).format(value);
}
