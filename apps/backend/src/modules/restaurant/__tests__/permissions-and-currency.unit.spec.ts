import {
  roleHasPermission,
  resolveRestaurantRole,
} from "../permissions"
import { assertModifierCurrency } from "../modifier-currency-policy"

describe("restaurant permissions", () => {
  it("defaults authenticated admin to owner", () => {
    expect(resolveRestaurantRole("user_1", null)).toBe("owner")
  })

  it("respects metadata role when valid", () => {
    expect(resolveRestaurantRole("user_1", "kitchen")).toBe("kitchen")
  })

  it("kitchen cannot write settings", () => {
    expect(
      roleHasPermission("kitchen", "restaurant.settings.write")
    ).toBe(false)
  })

  it("owner can read audit", () => {
    expect(roleHasPermission("owner", "restaurant.audit.read")).toBe(true)
  })
})

describe("modifier currency policy", () => {
  it("allows bhd", () => {
    expect(() => assertModifierCurrency("bhd")).not.toThrow()
  })

  it("rejects other currencies", () => {
    expect(() => assertModifierCurrency("usd")).toThrow(
      /RESTAURANT_CURRENCY_MISMATCH/
    )
  })
})
