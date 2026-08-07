/**
 * Shared Admin money formatting (major units, BHD default 3 dp).
 * Keep storefront convertToLocale / formatBhd as the customer-facing twin.
 */
export function formatRestaurantMoney(
  amount: number | null | undefined,
  currencyCode = "BHD"
): string {
  if (amount == null || Number.isNaN(Number(amount))) {
    return "—"
  }
  const code = (currencyCode || "BHD").toUpperCase()
  try {
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: code,
      minimumFractionDigits: code === "BHD" ? 3 : 2,
      maximumFractionDigits: code === "BHD" ? 3 : 2,
    }).format(Number(amount))
  } catch {
    return `${Number(amount).toFixed(code === "BHD" ? 3 : 2)} ${code}`
  }
}
