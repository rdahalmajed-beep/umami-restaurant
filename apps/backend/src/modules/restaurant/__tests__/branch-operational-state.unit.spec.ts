import {
  computeBranchOperationalState,
  isWithinOpeningHours,
} from "../branch-operational-state"

describe("branch operational state", () => {
  it("returns closed when branch inactive", () => {
    expect(
      computeBranchOperationalState({ is_active: false }, new Date())
    ).toBe("closed")
  })

  it("returns paused while pause is active", () => {
    const future = new Date(Date.now() + 60_000)
    expect(
      computeBranchOperationalState(
        { is_active: true, is_paused: true, pause_until: future },
        new Date()
      )
    ).toBe("paused")
  })

  it("returns open when hours allow and not paused", () => {
    const at = new Date("2026-07-31T12:00:00") // Friday
    expect(
      computeBranchOperationalState(
        {
          is_active: true,
          is_paused: false,
          opening_hours_json: {
            fri: "09:00-22:00",
          },
        },
        at
      )
    ).toBe("open")
  })

  it("handles overnight intervals", () => {
    const late = new Date("2026-07-31T23:30:00")
    expect(
      isWithinOpeningHours({ fri: "18:00-02:00" }, late)
    ).toBe(true)
  })

  it("returns at_capacity when hourly cap reached", () => {
    expect(
      computeBranchOperationalState(
        {
          is_active: true,
          capacity_orders_per_hour: 5,
          opening_hours_json: null,
        },
        new Date(),
        { orders_in_last_hour: 5 }
      )
    ).toBe("at_capacity")
  })
})
