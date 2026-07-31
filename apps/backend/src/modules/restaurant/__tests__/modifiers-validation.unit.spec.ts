/**
 * Unit tests for modifier constraint + price calculation rules (Phase 5).
 */

type Group = {
  name: string
  selection_type: "single" | "multiple"
  is_required: boolean
  min_selections: number
  max_selections: number
  options: { id: string; name: string; price_adjustment: number }[]
}

function validate(
  groups: Group[],
  optionIds: string[]
): { ok: true; price: number } | { ok: false; error: string } {
  const selected = new Set(optionIds)
  let price = 0

  for (const group of groups) {
    const chosen = group.options.filter((o) => selected.has(o.id))
    if (group.selection_type === "single" && chosen.length > 1) {
      return {
        ok: false,
        error: `Group "${group.name}" allows only one selection`,
      }
    }
    const min = group.is_required
      ? Math.max(group.min_selections, 1)
      : group.min_selections
    if (chosen.length < min) {
      return {
        ok: false,
        error: `Group "${group.name}" requires at least ${min} selection(s)`,
      }
    }
    if (chosen.length > group.max_selections) {
      return {
        ok: false,
        error: `Group "${group.name}" allows at most ${group.max_selections} selection(s)`,
      }
    }
    for (const o of chosen) {
      price += o.price_adjustment
    }
  }
  return { ok: true, price: Math.round(price * 1000) / 1000 }
}

const cheese: Group = {
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

const extras: Group = {
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

describe("restaurant modifier validation", () => {
  it("requires cheese selection", () => {
    const r = validate([cheese, extras], ["sauce"])
    expect(r.ok).toBe(false)
  })

  it("prices cheddar + extra sauce", () => {
    const r = validate([cheese, extras], ["ched", "sauce"])
    expect(r).toEqual({ ok: true, price: 0.45 })
  })

  it("rejects two cheeses", () => {
    const r = validate([cheese], ["ched", "swiss"])
    expect(r.ok).toBe(false)
  })

  it("allows no extras", () => {
    const r = validate([cheese, extras], ["no"])
    expect(r).toEqual({ ok: true, price: 0 })
  })
})
