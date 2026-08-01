/**
 * MOD-003 — Modifier pricing decision
 *
 * Chosen approach: **BHD-only**.
 * - Store currency is BHD.
 * - Modifier `price_adjustment` values are always BHD major units.
 * - Never convert/silently apply BHD numbers to another currency.
 * - If multi-currency is required later, introduce explicit price sets
 *   keyed by currency_code (never implicit FX).
 */
export const MODIFIER_CURRENCY_POLICY = {
  mode: "bhd_only" as const,
  currency_code: "bhd",
  enforce_on_validate: true,
}

export function assertModifierCurrency(cartCurrency?: string | null) {
  if (
    cartCurrency &&
    cartCurrency.toLowerCase() !== MODIFIER_CURRENCY_POLICY.currency_code
  ) {
    throw new Error(
      `RESTAURANT_CURRENCY_MISMATCH: modifiers are BHD-only, cart is ${cartCurrency}`
    )
  }
}
