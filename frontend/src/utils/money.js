/** Format money as "UGX 1,234" — never flag emoji (Windows shows 🇺🇬 as "UG"). */
export function formatMoney(amount, currency = "UGX") {
  const n = typeof amount === "number" ? amount : parseFloat(amount) || 0
  return `${currency} ${n.toLocaleString()}`
}

/** Compact thousands: "UGX 247K" */
export function formatMoneyK(amount, currency = "UGX") {
  const n = typeof amount === "number" ? amount : parseFloat(amount) || 0
  if (Math.abs(n) >= 1000) return `${currency} ${(n / 1000).toFixed(0)}K`
  return formatMoney(n, currency)
}
