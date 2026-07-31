/**
 * Unit tests for kitchen status transition rules (Phase 6).
 */

type Status =
  | "received"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled"

const ALLOWED: Record<Status, Status[]> = {
  received: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "completed", "cancelled"],
  out_for_delivery: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
}

function canTransition(
  from: Status,
  to: Status,
  orderType: "delivery" | "pickup" = "delivery"
): boolean {
  if (from === "cancelled") return false
  if (to === "out_for_delivery" && orderType === "pickup") return false
  if (to === "ready" && from === "received") return false
  return (ALLOWED[from] || []).includes(to)
}

describe("restaurant order status transitions", () => {
  it("allows received → accepted → preparing → ready → completed", () => {
    expect(canTransition("received", "accepted")).toBe(true)
    expect(canTransition("accepted", "preparing")).toBe(true)
    expect(canTransition("preparing", "ready")).toBe(true)
    expect(canTransition("ready", "completed")).toBe(true)
  })

  it("blocks ready before accepted", () => {
    expect(canTransition("received", "ready")).toBe(false)
  })

  it("blocks transitions from cancelled", () => {
    expect(canTransition("cancelled", "preparing")).toBe(false)
  })

  it("blocks out_for_delivery on pickup", () => {
    expect(canTransition("ready", "out_for_delivery", "pickup")).toBe(false)
    expect(canTransition("ready", "out_for_delivery", "delivery")).toBe(true)
  })
})
