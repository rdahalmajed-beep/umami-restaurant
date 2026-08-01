/**
 * Unit tests for kitchen status transitions against the real domain-rules module.
 */
import {
  canTransitionRestaurantStatus,
  type RestaurantOrderStatus,
} from "../domain-rules"

describe("assertRestaurantStatusTransition / canTransitionRestaurantStatus", () => {
  it("allows received → accepted → preparing → ready → completed", () => {
    expect(canTransitionRestaurantStatus("received", "accepted")).toBe(true)
    expect(canTransitionRestaurantStatus("accepted", "preparing")).toBe(true)
    expect(canTransitionRestaurantStatus("preparing", "ready")).toBe(true)
    expect(canTransitionRestaurantStatus("ready", "completed")).toBe(true)
  })

  it("blocks skipping preparing (received → ready)", () => {
    expect(canTransitionRestaurantStatus("received", "ready")).toBe(false)
    expect(canTransitionRestaurantStatus("accepted", "ready")).toBe(false)
  })

  it("blocks out_for_delivery on pickup", () => {
    expect(
      canTransitionRestaurantStatus("ready", "out_for_delivery", "pickup")
    ).toBe(false)
    expect(
      canTransitionRestaurantStatus("ready", "out_for_delivery", "delivery")
    ).toBe(true)
  })

  it("blocks transitions from cancelled", () => {
    const targets: RestaurantOrderStatus[] = [
      "received",
      "accepted",
      "preparing",
      "ready",
      "completed",
    ]
    for (const to of targets) {
      expect(canTransitionRestaurantStatus("cancelled", to)).toBe(false)
    }
  })
})
