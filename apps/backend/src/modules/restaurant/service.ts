import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import Branch from "./models/branch"
import ModifierGroup from "./models/modifier-group"
import ModifierOption from "./models/modifier-option"
import ProductModifierGroup from "./models/product-modifier-group"
import RestaurantOrder from "./models/restaurant-order"
import RestaurantOrderStatusEvent from "./models/restaurant-order-status-event"

export type ModifierSnapshotItem = {
  group_id: string
  group_name: string
  option_id: string
  option_name: string
  price_adjustment: number
}

export type ValidatedModifiersResult = {
  snapshot: ModifierSnapshotItem[]
  modifiers_unit_price: number
}

export type RestaurantOrderStatus =
  | "received"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled"

export const RESTAURANT_ORDER_STATUSES: RestaurantOrderStatus[] = [
  "received",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
]

/** Allowed forward transitions (kitchen flow). Cancelled is terminal. */
const ALLOWED_TRANSITIONS: Record<
  RestaurantOrderStatus,
  RestaurantOrderStatus[]
> = {
  received: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "completed", "cancelled"],
  out_for_delivery: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
}

type GroupWithOptions = {
  id: string
  name: string
  selection_type: "single" | "multiple"
  is_required: boolean
  min_selections: number
  max_selections: number
  sort_order: number
  options: {
    id: string
    name: string
    price_adjustment: number
    is_default: boolean
    is_active: boolean
    sort_order: number
  }[]
}

class RestaurantModuleService extends MedusaService({
  Branch,
  ModifierGroup,
  ModifierOption,
  ProductModifierGroup,
  RestaurantOrder,
  RestaurantOrderStatusEvent,
}) {
  async listProductModifierGroupsDetailed(
    productId: string
  ): Promise<GroupWithOptions[]> {
    const links = await this.listProductModifierGroups(
      { product_id: productId },
      { order: { sort_order: "ASC" } }
    )

    if (!links.length) {
      return []
    }

    const groupIds = links.map(
      (l: { modifier_group_id: string }) => l.modifier_group_id
    )

    const groups = await this.listModifierGroups(
      { id: groupIds },
      {
        relations: ["options"],
        order: { sort_order: "ASC" },
      }
    )

    const groupById = new Map(
      groups.map((g: GroupWithOptions & { id: string }) => [g.id, g])
    )

    return links
      .map((link: { modifier_group_id: string; sort_order: number }) => {
        const group = groupById.get(link.modifier_group_id)
        if (!group) {
          return null
        }
        const options = (group.options || [])
          .filter((o) => o.is_active)
          .sort((a, b) => a.sort_order - b.sort_order)
        return {
          id: group.id,
          name: group.name,
          selection_type: group.selection_type,
          is_required: group.is_required,
          min_selections: group.min_selections,
          max_selections: group.max_selections,
          sort_order: link.sort_order ?? group.sort_order,
          options,
        } satisfies GroupWithOptions
      })
      .filter(Boolean) as GroupWithOptions[]
  }

  async validateAndPriceModifiers(
    productId: string,
    optionIds: string[]
  ): Promise<ValidatedModifiersResult> {
    const groups = await this.listProductModifierGroupsDetailed(productId)
    const selected = new Set(optionIds)
    const snapshot: ModifierSnapshotItem[] = []
    let modifiersUnitPrice = 0

    const optionToGroup = new Map<
      string,
      { group: GroupWithOptions; option: GroupWithOptions["options"][number] }
    >()

    for (const group of groups) {
      for (const option of group.options) {
        optionToGroup.set(option.id, { group, option })
      }
    }

    for (const optionId of selected) {
      if (!optionToGroup.has(optionId)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Modifier option ${optionId} is not valid for this product`
        )
      }
    }

    for (const group of groups) {
      const chosen = group.options.filter((o) => selected.has(o.id))
      const count = chosen.length

      if (group.selection_type === "single" && count > 1) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Group "${group.name}" allows only one selection`
        )
      }

      const min = group.is_required
        ? Math.max(group.min_selections, 1)
        : group.min_selections
      const max = group.max_selections

      if (count < min) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Group "${group.name}" requires at least ${min} selection(s)`
        )
      }

      if (count > max) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Group "${group.name}" allows at most ${max} selection(s)`
        )
      }

      for (const option of chosen) {
        const adjustment = Number(option.price_adjustment) || 0
        modifiersUnitPrice += adjustment
        snapshot.push({
          group_id: group.id,
          group_name: group.name,
          option_id: option.id,
          option_name: option.name,
          price_adjustment: adjustment,
        })
      }
    }

    return {
      snapshot,
      modifiers_unit_price: roundMoney(modifiersUnitPrice),
    }
  }

  async linkModifierGroupToProduct(
    productId: string,
    modifierGroupId: string,
    sortOrder = 0
  ) {
    const existing = await this.listProductModifierGroups({
      product_id: productId,
      modifier_group_id: modifierGroupId,
    })

    if (existing.length) {
      return existing[0]
    }

    const [link] = await this.createProductModifierGroups([
      {
        product_id: productId,
        modifier_group_id: modifierGroupId,
        sort_order: sortOrder,
      },
    ])

    return link
  }

  async unlinkModifierGroupFromProduct(
    productId: string,
    modifierGroupId: string
  ) {
    const existing = await this.listProductModifierGroups({
      product_id: productId,
      modifier_group_id: modifierGroupId,
    })

    if (!existing.length) {
      return
    }

    await this.deleteProductModifierGroups(
      existing.map((l: { id: string }) => l.id)
    )
  }

  /**
   * Ensure a restaurant_order row exists for a Medusa order (status = received).
   */
  async ensureRestaurantOrder(input: {
    order_id: string
    order_type?: "delivery" | "pickup" | null
    branch_id?: string | null
    changed_by?: string | null
  }) {
    const existing = await this.listRestaurantOrders({
      order_id: input.order_id,
    })
    if (existing.length) {
      return existing[0]
    }

    const now = new Date()
    const [row] = await this.createRestaurantOrders([
      {
        order_id: input.order_id,
        status: "received",
        order_type: input.order_type ?? null,
        branch_id: input.branch_id ?? null,
        last_transition_at: now,
        last_transition_by: input.changed_by ?? "system",
      },
    ])

    await this.createRestaurantOrderStatusEvents([
      {
        restaurant_order_id: row.id,
        from_status: null,
        to_status: "received",
        changed_by: input.changed_by ?? "system",
        note: "Order placed",
      },
    ])

    return row
  }

  private assertTransitionAllowed(
    from: RestaurantOrderStatus,
    to: RestaurantOrderStatus,
    orderType?: "delivery" | "pickup" | null
  ) {
    if (from === to) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Status is already ${to}`
      )
    }

    if (from === "cancelled") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot transition from cancelled"
      )
    }

    // ready only via preparing (cannot skip accepted)
    if (to === "ready" && (from === "received" || from === "accepted")) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot set ready before preparing (must accept first)"
      )
    }

    const allowed = ALLOWED_TRANSITIONS[from] || []
    if (!allowed.includes(to)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid transition ${from} → ${to}`
      )
    }

    if (to === "out_for_delivery" && orderType === "pickup") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Pickup orders cannot enter out_for_delivery"
      )
    }
  }

  async transitionRestaurantOrderStatus(input: {
    order_id: string
    to_status: RestaurantOrderStatus
    changed_by?: string | null
    note?: string | null
  }) {
    const rows = await this.listRestaurantOrders({ order_id: input.order_id })
    let row = rows[0]
    if (!row) {
      row = await this.ensureRestaurantOrder({
        order_id: input.order_id,
        changed_by: input.changed_by,
      })
    }

    const from = row.status as RestaurantOrderStatus
    const to = input.to_status
    this.assertTransitionAllowed(from, to, row.order_type)

    const now = new Date()
    const updated = await this.updateRestaurantOrders({
      id: row.id,
      status: to,
      last_transition_at: now,
      last_transition_by: input.changed_by ?? null,
    })

    await this.createRestaurantOrderStatusEvents([
      {
        restaurant_order_id: row.id,
        from_status: from,
        to_status: to,
        changed_by: input.changed_by ?? null,
        note: input.note ?? null,
      },
    ])

    return this.retrieveRestaurantOrder(
      Array.isArray(updated) ? updated[0].id : updated.id,
      { relations: ["events"] }
    )
  }

  async getRestaurantOrderByOrderId(orderId: string) {
    const rows = await this.listRestaurantOrders(
      { order_id: orderId },
      { relations: ["events"] }
    )
    return rows[0] ?? null
  }
}

function roundMoney(n: number): number {
  return Math.round(n * 1000) / 1000
}

export default RestaurantModuleService
