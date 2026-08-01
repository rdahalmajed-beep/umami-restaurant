import {
  createGuestOrderAccessToken,
  verifyGuestOrderAccessToken,
} from "../guest-order-access"
import {
  selectShippingOptionForIntent,
  assertShippingMatchesIntent,
  isPickupShippingOption,
} from "../fulfillment-intent"

describe("guest order access token", () => {
  it("verifies a token created for the same order id", () => {
    const token = createGuestOrderAccessToken("order_123")
    expect(verifyGuestOrderAccessToken("order_123", token)).toBe(true)
  })

  it("rejects tokens for other order ids", () => {
    const token = createGuestOrderAccessToken("order_123")
    expect(verifyGuestOrderAccessToken("order_other", token)).toBe(false)
  })

  it("rejects missing or garbage tokens", () => {
    expect(verifyGuestOrderAccessToken("order_123", null)).toBe(false)
    expect(verifyGuestOrderAccessToken("order_123", "nope")).toBe(false)
  })
})

describe("fulfillment intent shipping selection", () => {
  const options = [
    {
      id: "so_delivery",
      name: "Delivery",
      amount: 1,
      type: { code: "delivery" },
    },
    {
      id: "so_pickup",
      name: "Pickup from Main Branch",
      amount: 0,
      type: { code: "pickup" },
    },
  ]

  it("selects pickup option for pickup intent", () => {
    const selected = selectShippingOptionForIntent(options, "pickup")
    expect(selected.id).toBe("so_pickup")
    expect(isPickupShippingOption(selected)).toBe(true)
  })

  it("selects delivery option for delivery intent", () => {
    const selected = selectShippingOptionForIntent(options, "delivery")
    expect(selected.id).toBe("so_delivery")
  })

  it("rejects mismatched shipping at checkout validation", () => {
    expect(() =>
      assertShippingMatchesIntent({
        orderType: "pickup",
        shippingOption: options[0],
        expectedOptionId: "so_pickup",
      })
    ).toThrow(/RESTAURANT_FULFILLMENT_MISMATCH/)
  })

  it("accepts matching pickup with zero amount", () => {
    expect(() =>
      assertShippingMatchesIntent({
        orderType: "pickup",
        shippingOption: options[1],
        expectedOptionId: "so_pickup",
      })
    ).not.toThrow()
  })
})
