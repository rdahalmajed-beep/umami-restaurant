import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import Branch from "./models/branch"
import ModifierGroup from "./models/modifier-group"
import ModifierOption from "./models/modifier-option"
import ProductModifierGroup from "./models/product-modifier-group"
import RestaurantOrder from "./models/restaurant-order"
import RestaurantOrderStatusEvent from "./models/restaurant-order-status-event"
import RestaurantSettings from "./models/restaurant-settings"
import BranchResourceAvailability from "./models/branch-resource-availability"
import Menu from "./models/menu"
import MenuSection from "./models/menu-section"
import MenuProduct from "./models/menu-product"
import BranchFulfillmentPolicy from "./models/branch-fulfillment-policy"
import RestaurantContent from "./models/restaurant-content"
import RestaurantAuditLog from "./models/restaurant-audit-log"
import IntegrationOutbox from "./models/integration-outbox"
import DeliveryZone from "./models/delivery-zone"
import BranchException from "./models/branch-exception"
import Meal from "./models/meal"
import MealStep from "./models/meal-step"
import MealStepItem from "./models/meal-step-item"
import RestaurantOffer from "./models/restaurant-offer"
import TranslationStatus from "./models/translation-status"
import {
  ACTIVE_KITCHEN_STATUSES,
  assertRestaurantStatusTransition,
  validateModifierSelections,
  type ModifierSnapshotItem,
  type RestaurantOrderStatus,
  type ValidatedModifiersResult,
} from "./domain-rules"
import {
  computeBranchOperationalState,
  type BranchOperationalState,
} from "./branch-operational-state"

export type {
  ModifierSnapshotItem,
  RestaurantOrderStatus,
  ValidatedModifiersResult,
} from "./domain-rules"
export {
  ACTIVE_KITCHEN_STATUSES,
  ALLOWED_TRANSITIONS,
  RESTAURANT_ORDER_STATUSES,
} from "./domain-rules"

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
  RestaurantSettings,
  BranchResourceAvailability,
  Menu,
  MenuSection,
  MenuProduct,
  BranchFulfillmentPolicy,
  RestaurantContent,
  RestaurantAuditLog,
  IntegrationOutbox,
  DeliveryZone,
  BranchException,
  Meal,
  MealStep,
  MealStepItem,
  RestaurantOffer,
  TranslationStatus,
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
      .map(
        (link: {
          modifier_group_id: string
          sort_order: number
          is_required_override?: boolean | null
          min_selections_override?: number | null
          max_selections_override?: number | null
          variant_ids_json?: string[] | null
          branch_ids_json?: string[] | null
        }) => {
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
            is_required:
              link.is_required_override != null
                ? !!link.is_required_override
                : group.is_required,
            min_selections:
              link.min_selections_override != null
                ? Number(link.min_selections_override)
                : group.min_selections,
            max_selections:
              link.max_selections_override != null
                ? Number(link.max_selections_override)
                : group.max_selections,
            sort_order: link.sort_order ?? group.sort_order,
            options,
            variant_ids: Array.isArray(link.variant_ids_json)
              ? link.variant_ids_json
              : null,
            branch_ids: Array.isArray(link.branch_ids_json)
              ? link.branch_ids_json
              : null,
          }
        }
      )
      .filter(Boolean) as (GroupWithOptions & {
      variant_ids?: string[] | null
      branch_ids?: string[] | null
    })[]
  }

  async listProductModifierGroupsForContext(
    productId: string,
    opts?: { branch_id?: string | null; variant_id?: string | null }
  ) {
    const groups = await this.listProductModifierGroupsDetailed(productId)
    return groups.filter((g) => {
      const withScope = g as GroupWithOptions & {
        variant_ids?: string[] | null
        branch_ids?: string[] | null
      }
      if (
        opts?.branch_id &&
        Array.isArray(withScope.branch_ids) &&
        withScope.branch_ids.length &&
        !withScope.branch_ids.includes(opts.branch_id)
      ) {
        return false
      }
      if (
        opts?.variant_id &&
        Array.isArray(withScope.variant_ids) &&
        withScope.variant_ids.length &&
        !withScope.variant_ids.includes(opts.variant_id)
      ) {
        return false
      }
      return true
    })
  }

  async validateAndPriceModifiers(
    productId: string,
    optionIds: string[]
  ): Promise<ValidatedModifiersResult> {
    const groups = await this.listProductModifierGroupsDetailed(productId)
    return validateModifierSelections(groups, optionIds)
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
    try {
      const [row] = await this.createRestaurantOrders([
        {
          order_id: input.order_id,
          status: "received",
          order_type: input.order_type ?? null,
          branch_id: input.branch_id ?? null,
          version: 1,
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
    } catch (err) {
      // Concurrent create: unique order_id → return the winner.
      const raced = await this.listRestaurantOrders({
        order_id: input.order_id,
      })
      if (raced.length) {
        return raced[0]
      }
      throw err
    }
  }

  private assertTransitionAllowed(
    from: RestaurantOrderStatus,
    to: RestaurantOrderStatus,
    orderType?: "delivery" | "pickup" | null
  ) {
    assertRestaurantStatusTransition(from, to, orderType)
  }

  async transitionRestaurantOrderStatus(input: {
    order_id: string
    to_status: RestaurantOrderStatus
    changed_by?: string | null
    note?: string | null
    expected_version?: number | null
  }) {
    const rows = await this.listRestaurantOrders({ order_id: input.order_id })
    let row = rows[0]
    if (!row) {
      row = await this.ensureRestaurantOrder({
        order_id: input.order_id,
        changed_by: input.changed_by,
      })
    }

    const currentVersion = Number(row.version ?? 1)
    if (
      input.expected_version != null &&
      input.expected_version !== currentVersion
    ) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        `RESTAURANT_ORDER_VERSION_CONFLICT: expected ${input.expected_version}, got ${currentVersion}`
      )
    }

    const from = row.status as RestaurantOrderStatus
    const to = input.to_status
    this.assertTransitionAllowed(from, to, row.order_type)

    const now = new Date()
    const updated = await this.updateRestaurantOrders({
      id: row.id,
      status: to,
      version: currentVersion + 1,
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

  /**
   * Kitchen inbox: active restaurant orders, newest first.
   */
  async listActiveKitchenOrders(input?: {
    statuses?: RestaurantOrderStatus[]
    limit?: number
    cursor?: string | null
    updated_since?: Date | string | null
  }) {
    const statuses =
      input?.statuses?.length ? input.statuses : ACTIVE_KITCHEN_STATUSES
    const limit = Math.min(Math.max(input?.limit ?? 30, 1), 100)

    let rows = await this.listRestaurantOrders(
      { status: statuses },
      {
        order: { created_at: "DESC" },
        take: 200,
      }
    )

    if (input?.updated_since) {
      const since = new Date(input.updated_since).getTime()
      rows = rows.filter(
        (r: { updated_at?: string | Date }) =>
          r.updated_at && new Date(r.updated_at).getTime() >= since
      )
    }

    if (input?.cursor) {
      const idx = rows.findIndex((r: { id: string }) => r.id === input.cursor)
      rows = idx >= 0 ? rows.slice(idx + 1) : rows
    }

    const has_more = rows.length > limit
    const page = has_more ? rows.slice(0, limit) : rows
    const next_cursor = has_more ? page[page.length - 1]?.id ?? null : null

    return { orders: page, next_cursor, has_more }
  }

  async listKitchenHistory(input?: {
    q?: string | null
    limit?: number
    offset?: number
  }) {
    const limit = Math.min(Math.max(input?.limit ?? 30, 1), 100)
    const offset = Math.max(input?.offset ?? 0, 0)
    const rows = await this.listRestaurantOrders(
      { status: ["completed", "cancelled"] },
      {
        order: { last_transition_at: "DESC" },
        take: limit,
        skip: offset,
      }
    )
    return rows
  }

  async getOrCreateSettings() {
    const existing = await this.listRestaurantSettings({}, { take: 1 })
    if (existing.length) {
      return existing[0]
    }
    const [row] = await this.createRestaurantSettings([
      {
        timezone: "Asia/Bahrain",
        default_locale: "ar",
        // JSON column stores locale list; Medusa types this as Record
        supported_locales_json: ["ar", "en"] as unknown as Record<
          string,
          unknown
        >,
        default_prep_minutes: 20,
        max_item_quantity: 20,
        ordering_enabled: true,
        schema_version: 1,
      },
    ] as never)
    return row
  }

  async updateSettings(patch: Record<string, unknown>) {
    const current = await this.getOrCreateSettings()
    return this.updateRestaurantSettings({
      id: current.id,
      ...patch,
    })
  }

  async getBranchOperationalState(
    branch: {
      is_active: boolean
      is_paused?: boolean | null
      pause_until?: Date | string | null
      opening_hours_json?: Record<string, unknown> | null
      timezone?: string | null
      capacity_orders_per_hour?: number | null
    },
    at?: Date,
    opts?: { orders_in_last_hour?: number }
  ): Promise<BranchOperationalState> {
    return computeBranchOperationalState(branch, at, opts)
  }

  async pauseBranch(input: {
    branch_id: string
    reason?: string | null
    pause_until?: Date | string | null
  }) {
    return this.updateBranches({
      id: input.branch_id,
      is_paused: true,
      pause_reason: input.reason ?? null,
      pause_until: input.pause_until
        ? new Date(input.pause_until)
        : null,
    })
  }

  async resumeBranch(branchId: string) {
    return this.updateBranches({
      id: branchId,
      is_paused: false,
      pause_reason: null,
      pause_until: null,
    })
  }

  /**
   * Hot-path 86 / restore for a branch resource (optimistic version).
   */
  async setBranchResourceAvailability(input: {
    branch_id: string
    resource_type: "product" | "variant" | "modifier_option"
    resource_id: string
    available: boolean
    reason_code?: string | null
    changed_by?: string | null
    expected_version?: number | null
    display_mode?: "hide" | "sold_out" | "visible_disabled" | null
    ends_at?: Date | null
  }) {
    const existing = await this.listBranchResourceAvailabilities({
      branch_id: input.branch_id,
      resource_type: input.resource_type,
      resource_id: input.resource_id,
    })

    const patch = {
      available: input.available,
      reason_code: input.reason_code ?? null,
      changed_by: input.changed_by ?? null,
      display_mode: input.display_mode ?? "sold_out",
      ends_at: input.ends_at ?? null,
    }

    if (existing.length) {
      const row = existing[0]
      const currentVersion = Number(row.version ?? 1)
      if (
        input.expected_version != null &&
        input.expected_version !== currentVersion
      ) {
        throw new MedusaError(
          MedusaError.Types.CONFLICT,
          `RESTAURANT_AVAILABILITY_VERSION_CONFLICT: expected ${input.expected_version}, got ${currentVersion}`
        )
      }
      return this.updateBranchResourceAvailabilities({
        id: row.id,
        ...patch,
        version: currentVersion + 1,
      })
    }

    const [created] = await this.createBranchResourceAvailabilities([
      {
        branch_id: input.branch_id,
        resource_type: input.resource_type,
        resource_id: input.resource_id,
        ...patch,
        version: 1,
      },
    ])
    return created
  }

  async writeAuditLog(input: {
    actor_id?: string | null
    actor_role?: string | null
    action: string
    resource_type: string
    resource_id?: string | null
    before?: unknown
    after?: unknown
    reason?: string | null
    correlation_id?: string | null
    ip?: string | null
  }) {
    const [row] = await this.createRestaurantAuditLogs([
      {
        actor_id: input.actor_id ?? null,
        actor_role: input.actor_role ?? null,
        action: input.action,
        resource_type: input.resource_type,
        resource_id: input.resource_id ?? null,
        before_json: (input.before ?? null) as Record<string, unknown> | null,
        after_json: (input.after ?? null) as Record<string, unknown> | null,
        reason: input.reason ?? null,
        correlation_id: input.correlation_id ?? null,
        ip: input.ip ?? null,
      },
    ] as never)
    return row
  }

  async enqueueOutbox(input: {
    event_type: string
    payload: Record<string, unknown>
    idempotency_key: string
  }) {
    const existing = await this.listIntegrationOutboxes({
      idempotency_key: input.idempotency_key,
    })
    if (existing.length) {
      return existing[0]
    }
    const [row] = await this.createIntegrationOutboxes([
      {
        event_type: input.event_type,
        payload_json: input.payload,
        status: "pending",
        attempts: 0,
        idempotency_key: input.idempotency_key,
        next_attempt_at: new Date(),
      },
    ])
    return row
  }

  async upsertFulfillmentPolicy(input: {
    branch_id: string
    order_type: "delivery" | "pickup"
    min_order_amount?: number
    flat_fee?: number | null
    free_threshold?: number | null
    estimated_minutes?: number
    lead_time_minutes?: number
    is_paused?: boolean
    zone_notes_json?: Record<string, unknown> | null
  }) {
    const existing = await this.listBranchFulfillmentPolicies({
      branch_id: input.branch_id,
      order_type: input.order_type,
    })
    if (existing.length) {
      return this.updateBranchFulfillmentPolicies({
        id: existing[0].id,
        ...input,
      })
    }
    const [row] = await this.createBranchFulfillmentPolicies([input])
    return row
  }

  async getOrCreateContent(key: string, locale: string) {
    const existing = await this.listRestaurantContents({ key, locale })
    if (existing.length) {
      return existing[0]
    }
    const [row] = await this.createRestaurantContents([
      {
        key,
        locale,
        content_json: {},
        schema_version: 1,
      },
    ])
    return row
  }

  async duplicateModifierGroup(groupId: string) {
    const group = await this.retrieveModifierGroup(groupId, {
      relations: ["options"],
    })
    const [copy] = await this.createModifierGroups([
      {
        name: `${group.name} (copy)`,
        selection_type: group.selection_type,
        is_required: group.is_required,
        min_selections: group.min_selections,
        max_selections: group.max_selections,
        sort_order: Number(group.sort_order || 0) + 1,
      },
    ])
    const options = (group.options || []) as {
      name: string
      price_adjustment: number
      is_default: boolean
      is_active: boolean
      sort_order: number
    }[]
    if (options.length) {
      await this.createModifierOptions(
        options.map((o) => ({
          name: o.name,
          price_adjustment: o.price_adjustment,
          is_default: o.is_default,
          is_active: o.is_active,
          sort_order: o.sort_order,
          modifier_group_id: copy.id,
        }))
      )
    }
    return this.retrieveModifierGroup(copy.id, { relations: ["options"] })
  }
}

export default RestaurantModuleService
