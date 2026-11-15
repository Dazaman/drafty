export function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);
}
