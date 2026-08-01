import { createHash } from "crypto"
import {
  ContainerRegistrationKeys,
  QueryContext,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework"
import { RESTAURANT_MODULE } from "./index"
import type RestaurantModuleService from "./service"

export type MenuProjectionInput = {
  branch_id?: string | null
  order_type?: "delivery" | "pickup" | null
  locale?: string | null
  currency_code?: string | null
}

/**
 * Compact published-menu projection for storefront (MENU-003).
 */
export async function buildMenuProjection(
  container: MedusaContainer,
  input: MenuProjectionInput
) {
  const restaurant: RestaurantModuleService =
    container.resolve(RESTAURANT_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const settings = await restaurant.getOrCreateSettings()
  const locale = input.locale || settings.default_locale || "ar"
  const currency = (input.currency_code || "bhd").toLowerCase()

  let operational_state: string = "open"
  if (input.branch_id) {
    try {
      const branch = await restaurant.retrieveBranch(input.branch_id)
      operational_state = await restaurant.getBranchOperationalState(branch)
    } catch {
      operational_state = "closed"
    }
  }

  if (!settings.ordering_enabled) {
    operational_state = "paused"
  }

  const menus = await restaurant.listMenus(
    { status: "published" },
    {
      order: { sort_order: "ASC" },
      take: 20,
      relations: ["sections", "sections.products"],
    }
  )

  const filteredMenus = (menus || []).filter((m: {
    applies_delivery?: boolean
    applies_pickup?: boolean
    branch_ids_json?: string[] | null
  }) => {
    if (input.order_type === "delivery" && m.applies_delivery === false) {
      return false
    }
    if (input.order_type === "pickup" && m.applies_pickup === false) {
      return false
    }
    const branches = m.branch_ids_json
    if (
      input.branch_id &&
      Array.isArray(branches) &&
      branches.length &&
      !branches.includes(input.branch_id)
    ) {
      return false
    }
    return true
  })

  const productIds = new Set<string>()
  for (const menu of filteredMenus as {
    sections?: { products?: { product_id: string; is_active?: boolean }[] }[]
  }[]) {
    for (const section of menu.sections || []) {
      for (const p of section.products || []) {
        if (p.is_active !== false) productIds.add(p.product_id)
      }
    }
  }

  const ids = [...productIds]
  let productsById = new Map<string, Record<string, unknown>>()
  if (ids.length) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "handle",
        "thumbnail",
        "status",
        "variants.id",
        "variants.title",
        "variants.calculated_price.*",
      ],
      filters: { id: ids },
      context: {
        variants: {
          calculated_price: QueryContext({ currency_code: currency }),
        },
      },
    })
    productsById = new Map(
      (products || []).map((p: { id: string }) => [p.id, p as Record<string, unknown>])
    )
  }

  const unavailable = input.branch_id
    ? await restaurant.listBranchResourceAvailabilities({
        branch_id: input.branch_id,
        available: false,
        resource_type: "product",
      })
    : []
  const unavailableIds = new Set(
    unavailable.map((u: { resource_id: string }) => u.resource_id)
  )

  const projectionMenus = []
  for (const menu of filteredMenus as {
    id: string
    title: string
    subtitle?: string | null
    title_i18n_json?: Record<string, string> | null
    subtitle_i18n_json?: Record<string, string> | null
    version?: number
    sections?: {
      id: string
      title: string
      subtitle?: string | null
      sort_order?: number
      is_active?: boolean
      products?: {
        id: string
        product_id: string
        sort_order?: number
        is_featured?: boolean
        badge?: string | null
        is_active?: boolean
      }[]
    }[]
  }[]) {
    const title =
      menu.title_i18n_json?.[locale] || menu.title
    const subtitle =
      menu.subtitle_i18n_json?.[locale] || menu.subtitle || null

    const sections = [...(menu.sections || [])]
      .filter((s) => s.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((section) => {
        const products = [...(section.products || [])]
          .filter((p) => p.is_active !== false)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((p) => {
            const product = productsById.get(p.product_id) || null
            return {
              menu_product_id: p.id,
              product_id: p.product_id,
              is_featured: !!p.is_featured,
              badge: p.badge || null,
              available: !unavailableIds.has(p.product_id),
              product,
            }
          })
        return {
          id: section.id,
          title: section.title,
          subtitle: section.subtitle || null,
          products,
        }
      })

    projectionMenus.push({
      id: menu.id,
      title,
      subtitle,
      version: menu.version ?? 1,
      sections,
    })
  }

  let policies: unknown[] = []
  if (input.branch_id) {
    const rows = await restaurant.listBranchFulfillmentPolicies(
      {
        branch_id: input.branch_id,
        ...(input.order_type ? { order_type: input.order_type } : {}),
      },
      { take: 10 }
    )
    policies = rows.map(
      (p: {
        order_type: string
        min_order_amount: number
        flat_fee?: number | null
        free_threshold?: number | null
        estimated_minutes: number
        is_paused: boolean
      }) => ({
        order_type: p.order_type,
        min_order_amount: Number(p.min_order_amount || 0),
        flat_fee: p.flat_fee != null ? Number(p.flat_fee) : null,
        free_threshold:
          p.free_threshold != null ? Number(p.free_threshold) : null,
        estimated_minutes: Number(p.estimated_minutes || 30),
        is_paused: !!p.is_paused,
      })
    )
  }

  const body = {
    operational_state,
    locale,
    currency_code: currency,
    ordering_enabled: !!settings.ordering_enabled,
    policies,
    menus: projectionMenus,
  }

  const etag = createHash("sha1")
    .update(JSON.stringify(body))
    .digest("hex")

  return { body, etag }
}
