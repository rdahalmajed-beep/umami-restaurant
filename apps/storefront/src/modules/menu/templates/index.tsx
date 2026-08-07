import { listCategories } from "@lib/data/categories"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { retrieveCart } from "@lib/data/cart"
import {
  getRestaurantMenuProjection,
  getFulfillmentPolicies,
} from "@lib/data/restaurant"
import MenuView, {
  MenuCategorySection,
} from "@modules/menu/components/menu-view"
import { HttpTypes } from "@medusajs/types"

function projectionToSections(
  projection: NonNullable<
    Awaited<ReturnType<typeof getRestaurantMenuProjection>>
  >,
  currency: string
): MenuCategorySection[] {
  const sections: MenuCategorySection[] = []
  for (const menu of projection.menus || []) {
    for (const section of menu.sections || []) {
      const products = section.products
        .filter((p) => p.product && p.available !== false)
        .map((p) => {
          const raw = p.product!
          return {
            id: raw.id,
            title: raw.title || "Item",
            handle: raw.handle || raw.id,
            thumbnail: raw.thumbnail || null,
            status: (raw.status as HttpTypes.StoreProduct["status"]) || "published",
            variants: (raw.variants || []).map((v) => ({
              id: v.id,
              title: v.title,
              calculated_price: v.calculated_price?.calculated_amount != null
                ? {
                    calculated_amount: v.calculated_price.calculated_amount,
                    original_amount: v.calculated_price.calculated_amount,
                    currency_code:
                      v.calculated_price.currency_code || currency,
                    calculated_price: { price_list_type: "default" },
                  }
                : undefined,
              manage_inventory: false,
              allow_backorder: true,
              inventory_quantity: 1,
            })),
          } as HttpTypes.StoreProduct
        })
      if (!products.length) continue
      sections.push({
        id: section.id,
        name: section.title,
        handle: section.id,
        products,
      })
    }
  }
  return sections
}

export default async function MenuTemplate({
  countryCode,
  compactHeader = false,
}: {
  countryCode: string
  /** When true (home), skip the large page title block. */
  compactHeader?: boolean
}) {
  const region = await getRegion(countryCode)
  if (!region) return null

  const cart = await retrieveCart()
  const restaurantMeta = (cart?.metadata?.restaurant || {}) as {
    branch_id?: string
    order_type?: "delivery" | "pickup"
  }

  const currency =
    region.currency_code?.toLowerCase() ||
    cart?.currency_code?.toLowerCase() ||
    "bhd"

  const projection = await getRestaurantMenuProjection({
    branchId: restaurantMeta.branch_id || null,
    orderType: restaurantMeta.order_type || null,
    locale: "ar",
    currencyCode: currency,
  })

  let finalSections: MenuCategorySection[] = []
  let usedProjection = false
  let operationalHint: string | null = null
  let policyHint: string | null = null

  if (projection && (projection.menus?.length || 0) > 0) {
    finalSections = projectionToSections(projection, currency)
    usedProjection = finalSections.length > 0
    if (!projection.ordering_enabled || projection.operational_state === "paused") {
      operationalHint = "Ordering is currently paused."
    } else if (projection.operational_state === "closed") {
      operationalHint = "This branch is closed right now."
    }
    const policy =
      projection.policies?.find(
        (p) => p.order_type === restaurantMeta.order_type
      ) || projection.policies?.[0]
    if (policy) {
      const parts: string[] = []
      if (policy.min_order_amount > 0) {
        parts.push(`Min order ${policy.min_order_amount} ${currency.toUpperCase()}`)
      }
      if (policy.estimated_minutes) {
        parts.push(`~${policy.estimated_minutes} min`)
      }
      if (policy.is_paused) {
        parts.push("This fulfillment type is paused")
      }
      if (parts.length) policyHint = parts.join(" · ")
    }
  }

  // No published restaurant menu → Medusa product categories (still Medusa SoT).
  // Never use a hardcoded storefront catalog.
  if (!usedProjection) {
    const [categories, productResult] = await Promise.all([
      listCategories({ limit: 50 }),
      listProducts({
        countryCode,
        queryParams: {
          limit: 100,
          fields:
            "*variants.calculated_price,+variants.inventory_quantity,*variants.options,*images,+thumbnail,+description,+metadata",
        },
      }),
    ])

    const pricedById = new Map(
      productResult.response.products.map((p) => [p.id, p])
    )

    const topLevel = (categories || []).filter((c) => !c.parent_category)

    const sections: MenuCategorySection[] = topLevel
      .map((cat) => {
        const fromCategory = (cat.products || [])
          .map((p) => pricedById.get(p.id!))
          .filter(Boolean) as HttpTypes.StoreProduct[]

        const products =
          fromCategory.length > 0
            ? fromCategory
            : productResult.response.products.filter((p) =>
                (p.categories || []).some((c) => c.id === cat.id)
              )

        return {
          id: cat.id,
          name: cat.name,
          handle: cat.handle,
          products,
        }
      })
      .filter((s) => s.products.length > 0)

    finalSections =
      sections.length > 0
        ? sections
        : [
            {
              id: "all",
              name: "Menu",
              handle: "menu",
              products: productResult.response.products,
            },
          ]

    if (restaurantMeta.branch_id && restaurantMeta.order_type) {
      const policies = await getFulfillmentPolicies({
        branchId: restaurantMeta.branch_id,
        orderType: restaurantMeta.order_type,
      })
      const policy = policies[0]
      if (policy?.min_order_amount) {
        policyHint = `Min order ${policy.min_order_amount} ${currency.toUpperCase()}`
      }
    }
  }

  if (!finalSections.length) {
    return (
      <div
        className="umami-atmosphere min-h-[calc(100vh-64px)]"
        data-testid="menu-page"
      >
        <div className="content-container pt-8 pb-16">
          <h1 className="font-display text-4xl text-umami-ink mb-2">Menu</h1>
          <p
            className="text-sm text-umami-terracotta"
            data-testid="menu-setup-required"
          >
            No sellable products yet. Run commerce + Umami menu seeds, or publish
            a restaurant menu in Admin.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="umami-atmosphere min-h-[calc(100vh-64px)]"
      data-testid="menu-page"
    >
      <div
        className={
          compactHeader
            ? "content-container pb-16 pt-2"
            : "content-container pt-8 pb-16"
        }
      >
        {!compactHeader ? (
          <>
            <h1
              className="font-display text-4xl text-umami-ink mb-2"
              data-testid="store-page-title"
            >
              Menu
            </h1>
            <p className="text-sm text-umami-ink/60 mb-2 max-w-lg">
              Browse by category, customize your plate, and add it to your order.
            </p>
          </>
        ) : null}
        {operationalHint ? (
          <p
            className="text-sm text-umami-terracotta mb-2"
            data-testid="menu-operational-hint"
          >
            {operationalHint}
          </p>
        ) : null}
        {policyHint ? (
          <p
            className="text-sm text-umami-leaf mb-4"
            data-testid="menu-policy-hint"
          >
            {policyHint}
          </p>
        ) : (
          <div className="mb-4" />
        )}
        <MenuView sections={finalSections} region={region} />
      </div>
    </div>
  )
}
