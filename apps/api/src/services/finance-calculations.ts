export type CancellationRule = { hoursBeforeDeparture: number; feePercent: number };

export function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateTax(baseFare: number, discount: number, rate: number, afterDiscount: boolean) {
  const taxable = afterDiscount ? baseFare - discount : baseFare;
  return money(taxable * rate / 100);
}

export function calculateCommission(baseFare: number, discount: number, seats: number, type: "FIXED" | "PERCENTAGE", value: number) {
  return money(type === "FIXED" ? value * seats : (baseFare - discount) * value / 100);
}

export function calculateCancellation(total: number, hoursBeforeDeparture: number, rules: CancellationRule[]) {
  const sorted = [...rules].sort((a, b) => b.hoursBeforeDeparture - a.hoursBeforeDeparture);
  const selected = sorted.find(rule => hoursBeforeDeparture >= rule.hoursBeforeDeparture) ?? sorted.at(-1);
  const feePercent = selected?.feePercent ?? 100;
  const feeAmount = money(total * feePercent / 100);
  return { feePercent, feeAmount, eligibleRefund: money(Math.max(0, total - feeAmount)) };
}
