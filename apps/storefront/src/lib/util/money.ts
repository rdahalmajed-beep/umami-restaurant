import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

/** Major-unit amount → localized currency string (Medusa amounts are major units for BHD). */
export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits,
  maximumFractionDigits,
  locale = "en-US",
}: ConvertToLocaleParams) => {
  const code = (currency_code || "").toUpperCase()
  const isBhd = code === "BHD"
  return currency_code && !isEmpty(currency_code)
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: code,
        minimumFractionDigits:
          minimumFractionDigits ?? (isBhd ? 3 : undefined),
        maximumFractionDigits:
          maximumFractionDigits ?? (isBhd ? 3 : undefined),
      }).format(amount)
    : amount.toString()
}

/** Canonical BHD display (3 decimal places). Prefer convertToLocale when currency varies. */
export function formatBhd(amount: number, locale = "en-BH") {
  return convertToLocale({
    amount,
    currency_code: "BHD",
    locale,
  })
}

/** Admin/UI helper for restaurant monetary amounts in major units. */
export function formatRestaurantMoney(
  amount: number | null | undefined,
  currencyCode = "BHD"
) {
  if (amount == null || Number.isNaN(Number(amount))) {
    return "—"
  }
  return convertToLocale({
    amount: Number(amount),
    currency_code: currencyCode || "BHD",
    locale: "en-BH",
  })
}
