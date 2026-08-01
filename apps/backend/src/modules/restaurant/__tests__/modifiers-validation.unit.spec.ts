/**
 * Unit tests for modifier validation against the real domain-rules module.
 */
import { MedusaError } from "@medusajs/framework/utils"
import {
  validateModifierSelections,
  type ModifierGroupInput,
} from "../domain-rules"

const cheese: ModifierGroupInput = {
  id: "g-cheese",
  name: "Choose Cheese",
  selection_type: "single",
  is_required: true,
  min_selections: 1,
  max_selections: 1,
  options: [
    { id: "no", name: "No Cheese", price_adjustment: 0 },
    { id: "ched", name: "Cheddar", price_adjustment: 0.3 },
    { id: "swiss", name: "Swiss", price_adjustment: 0.4 },
  ],
}

const extras: ModifierGroupInput = {
  id: "g-extras",
  name: "Extras",
  selection_type: "multiple",
  is_required: false,
  min_selections: 0,
  max_selections: 3,
  options: [
    { id: "patty", name: "Extra Patty", price_adjustment: 1 },
    { id: "jal", name: "Jalapeño", price_adjustment: 0.2 },
    { id: "sauce", name: "Extra Sauce", price_adjustment: 0.15 },
  ],
}

describe("validateModifierSelections", () => {
  it("requires cheese selection", () => {
    expect(() => validateModifierSelections([cheese, extras], ["sauce"])).toThrow(
      MedusaError
    )
  })

  it("rejects two cheeses for a single group", () => {
    expect(() =>
      validateModifierSelections([cheese, extras], ["ched", "swiss"])
    ).toThrow(/only one selection/)
  })

  it("prices cheddar + patty + sauce", () => {
    const r = validateModifierSelections([cheese, extras], [
      "ched",
      "patty",
      "sauce",
    ])
    expect(r.modifiers_unit_price).toBe(1.45)
    expect(r.snapshot).toHaveLength(3)
  })

  it("fails when validateModifierSelections rules are broken (max extras)", () => {
    expect(() =>
      validateModifierSelections([cheese, extras], [
        "ched",
        "patty",
        "jal",
        "sauce",
        "no",
      ])
    ).toThrow()
  })
})
