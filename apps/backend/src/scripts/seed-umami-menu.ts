/**
 * Idempotent Umami Manama menu seed — real ramen catalog (BHD).
 *
 * Creates categories (Mains / Sides / Drinks), products with prices,
 * extras modifier group, soft-drink flavor option, and links modifiers.
 *
 * Prerequisites: run seed-restaurant-commerce.ts first (store, region, channel).
 *
 *   pnpm --filter @dtc/backend exec medusa exec ./src/scripts/seed-umami-menu.ts
 */

import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  linkProductsToSalesChannelWorkflow,
} from "@medusajs/medusa/core-flows"
import { RESTAURANT_MODULE } from "../modules/restaurant"
import RestaurantModuleService from "../modules/restaurant/service"

const CURRENCY_CODE = "bhd"
const SALES_CHANNEL_NAME = "Web Store"
const EXTRAS_GROUP = "إضافات"
const FLAVOR_GROUP = "نكهة المشروب"
const PERI_GROUP = "صوص إضافي"

const CATEGORIES = [
  { name: "الأطباق الرئيسية", handle: "mains" },
  { name: "الأطباق الجانبية", handle: "sides" },
  { name: "المشروبات", handle: "drinks" },
] as const

type ProductDef = {
  title: string
  handle: string
  description: string
  categoryHandle: "mains" | "sides" | "drinks"
  price: number
  sku: string
  flavors?: string[]
  linkExtras?: boolean
  linkPeri?: boolean
}

const PRODUCTS: ProductDef[] = [
  {
    title: "رامن تشيزي بانش بالنقانق",
    handle: "ramen-cheesy-bunch-sausage",
    description: "رامن أجبان بصلصة صويانية خفيفة تقدم مع قطع النقانق",
    categoryHandle: "mains",
    price: 1.8,
    sku: "RAMEN-CHEEZY-SAUSAGE",
    linkExtras: true,
  },
  {
    title: "رامن تشيزي بانش بالدجاج",
    handle: "ramen-cheesy-bunch-chicken",
    description: "رامن أجبان بصلصة صويانية خفيفة تقدم مع قطع الدجاج المقرمشة",
    categoryHandle: "mains",
    price: 2.0,
    sku: "RAMEN-CHEEZY-CHICKEN",
    linkExtras: true,
  },
  {
    title: "رامن ترياكي",
    handle: "ramen-teriyaki",
    description: "رامن بصوص الترياكي المتوازن بين الحلو والمالح",
    categoryHandle: "mains",
    price: 1.5,
    sku: "RAMEN-TERIYAKI",
    linkExtras: true,
  },
  {
    title: "رامن باستاليا",
    handle: "ramen-pastalia",
    description: "رامن حامض إيطالي بنكهة الباستا المميزة",
    categoryHandle: "mains",
    price: 2.0,
    sku: "RAMEN-PASTALIA",
    linkExtras: true,
  },
  {
    title: "رامن وامي",
    handle: "ramen-umami",
    description: "رامن تمبورا الخضار بنكهة آسيوية مميزة",
    categoryHandle: "mains",
    price: 1.8,
    sku: "RAMEN-UMAMI",
    linkExtras: true,
  },
  {
    title: "رامن ليمزي بانش",
    handle: "ramen-limezy-bunch",
    description: "مزيج من الحامض والحلو مع لذعة حرارة خفيفة",
    categoryHandle: "mains",
    price: 1.5,
    sku: "RAMEN-LIMEZY",
    linkExtras: true,
  },
  {
    title: "جابانيز فرايز",
    handle: "japanese-fries",
    description: "يقدم بالدجاج أو اللحم",
    categoryHandle: "sides",
    price: 1.8,
    sku: "SIDE-JP-FRIES",
    linkExtras: true,
  },
  {
    title: "جابانيز فرايز شريمب",
    handle: "japanese-fries-shrimp",
    description: "جابانيز فرايز مع الروبيان",
    categoryHandle: "sides",
    price: 2.0,
    sku: "SIDE-JP-FRIES-SHRIMP",
    linkExtras: true,
  },
  {
    title: "كاراغي دجاج",
    handle: "karaage-chicken",
    description: "يمكن إضافة: صوص البيري بيري",
    categoryHandle: "sides",
    price: 1.5,
    sku: "SIDE-KARAAGE",
    linkExtras: true,
    linkPeri: true,
  },
  {
    title: "ماء",
    handle: "water",
    description: "ماء",
    categoryHandle: "drinks",
    price: 0.1,
    sku: "DRINK-WATER",
  },
  {
    title: "مشروب غازي",
    handle: "umami-soft-drink",
    description: "كولا، ريج، برتقال، ستريس، توت",
    categoryHandle: "drinks",
    price: 0.25,
    sku: "DRINK-SOFT-UMAMI",
    flavors: ["كولا", "ريج", "برتقال", "ستريس", "توت"],
  },
]

const EXTRAS = [
  { name: "نقانق", price: 0.2 },
  { name: "خضار", price: 0.3 },
  { name: "دجاج", price: 0.5 },
  { name: "هالبينو", price: 0.15 },
  { name: "اكسترا جبن", price: 0.2 },
  { name: "ميني ذرة", price: 0.2 },
]

async function findOne<T extends { id: string }>(
  query: {
    graph: (args: {
      entity: string
      fields: string[]
      filters?: Record<string, unknown>
    }) => Promise<{ data: T[] }>
  },
  entity: string,
  fields: string[],
  filters: Record<string, unknown>
): Promise<T | null> {
  const { data } = await query.graph({ entity, fields, filters })
  return data?.[0] ?? null
}

export default async function seedUmamiMenu({
  container,
}: {
  container: MedusaContainer
}): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const restaurant: RestaurantModuleService =
    container.resolve(RESTAURANT_MODULE)

  logger.info("=== Umami Manama menu seed ===")

  const salesChannel = await findOne<{ id: string; name: string }>(
    query,
    "sales_channel",
    ["id", "name"],
    { name: SALES_CHANNEL_NAME }
  )
  if (!salesChannel) {
    throw new Error(
      `Sales channel "${SALES_CHANNEL_NAME}" missing. Run seed-restaurant-commerce.ts first.`
    )
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  })
  const shippingProfile = shippingProfiles?.[0]
  if (!shippingProfile) {
    throw new Error("No shipping profile found.")
  }

  // --- Categories ---
  const categoryIds: Record<string, string> = {}
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle"],
  })

  for (const cat of CATEGORIES) {
    const found = (existingCategories ?? []).find(
      (c: { handle?: string; name: string }) =>
        c.handle === cat.handle || c.name === cat.name
    )
    if (found) {
      categoryIds[cat.handle] = found.id
      logger.info(`Reused category ${cat.name}`)
    }
  }

  const missingCats = CATEGORIES.filter((c) => !categoryIds[c.handle])
  if (missingCats.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingCats.map((c, i) => ({
          name: c.name,
          handle: c.handle,
          is_active: true,
          is_internal: false,
          rank: i,
        })),
      },
    })
    for (const created of result) {
      const match = CATEGORIES.find(
        (c) => c.handle === created.handle || c.name === created.name
      )
      if (match) categoryIds[match.handle] = created.id
      logger.info(`Created category ${created.name}`)
    }
  }

  // --- Modifier groups ---
  let extrasGroups = await restaurant.listModifierGroups(
    { name: EXTRAS_GROUP },
    { relations: ["options"] }
  )
  let extras = extrasGroups[0]
  if (!extras) {
    ;[extras] = await restaurant.createModifierGroups([
      {
        name: EXTRAS_GROUP,
        selection_type: "multiple",
        is_required: false,
        min_selections: 0,
        max_selections: 6,
        sort_order: 1,
      },
    ])
    await restaurant.createModifierOptions(
      EXTRAS.map((e, i) => ({
        name: e.name,
        price_adjustment: e.price,
        is_default: false,
        is_active: true,
        sort_order: i + 1,
        group_id: extras.id,
      }))
    )
    logger.info(`Created modifier group ${EXTRAS_GROUP}`)
  } else {
    logger.info(`Reused modifier group ${EXTRAS_GROUP}`)
  }

  let periGroups = await restaurant.listModifierGroups(
    { name: PERI_GROUP },
    { relations: ["options"] }
  )
  let peri = periGroups[0]
  if (!peri) {
    ;[peri] = await restaurant.createModifierGroups([
      {
        name: PERI_GROUP,
        selection_type: "multiple",
        is_required: false,
        min_selections: 0,
        max_selections: 1,
        sort_order: 2,
      },
    ])
    await restaurant.createModifierOptions([
      {
        name: "صوص البيري بيري",
        price_adjustment: 0.25,
        is_default: false,
        is_active: true,
        sort_order: 1,
        group_id: peri.id,
      },
    ])
    logger.info(`Created modifier group ${PERI_GROUP}`)
  }

  let flavorGroups = await restaurant.listModifierGroups(
    { name: FLAVOR_GROUP },
    { relations: ["options"] }
  )
  let flavors = flavorGroups[0]
  if (!flavors) {
    ;[flavors] = await restaurant.createModifierGroups([
      {
        name: FLAVOR_GROUP,
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        sort_order: 1,
      },
    ])
    const softFlavors = ["كولا", "ريج", "برتقال", "ستريس", "توت"]
    await restaurant.createModifierOptions(
      softFlavors.map((name, i) => ({
        name,
        price_adjustment: 0,
        is_default: i === 0,
        is_active: true,
        sort_order: i + 1,
        group_id: flavors.id,
      }))
    )
    logger.info(`Created modifier group ${FLAVOR_GROUP}`)
  }

  // --- Products ---
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  })
  const byHandle = new Map(
    (existingProducts ?? []).map((p: { id: string; handle: string }) => [
      p.handle,
      p.id,
    ])
  )

  const toCreate = PRODUCTS.filter((p) => !byHandle.has(p.handle))
  if (toCreate.length) {
    const payload = toCreate.map((p) => {
      if (p.flavors?.length) {
        return {
          title: p.title,
          handle: p.handle,
          description: p.description,
          category_ids: [categoryIds[p.categoryHandle]],
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          options: [{ title: "Flavor", values: p.flavors }],
          variants: p.flavors.map((f, i) => ({
            title: f,
            sku: `${p.sku}-${i + 1}`,
            manage_inventory: false,
            options: { Flavor: f },
            prices: [{ amount: p.price, currency_code: CURRENCY_CODE }],
          })),
          sales_channels: [{ id: salesChannel.id }],
        }
      }
      return {
        title: p.title,
        handle: p.handle,
        description: p.description,
        category_ids: [categoryIds[p.categoryHandle]],
        status: ProductStatus.PUBLISHED,
        shipping_profile_id: shippingProfile.id,
        options: [{ title: "Default", values: ["Default"] }],
        variants: [
          {
            title: "Default",
            sku: p.sku,
            manage_inventory: false,
            options: { Default: "Default" },
            prices: [{ amount: p.price, currency_code: CURRENCY_CODE }],
          },
        ],
        sales_channels: [{ id: salesChannel.id }],
      }
    })

    await createProductsWorkflow(container).run({
      input: { products: payload },
    })
    for (const p of toCreate) {
      logger.info(`Created product ${p.title} @ ${p.price} BHD`)
    }

    const { data: refreshed } = await query.graph({
      entity: "product",
      fields: ["id", "handle"],
    })
    for (const p of refreshed ?? []) {
      byHandle.set(p.handle, p.id)
    }
  } else {
    logger.info("All Umami products already exist")
  }

  // Ensure sales channel link for existing
  const productIds = PRODUCTS.map((p) => byHandle.get(p.handle)).filter(
    Boolean
  ) as string[]
  if (productIds.length) {
    try {
      await linkProductsToSalesChannelWorkflow(container).run({
        input: {
          id: salesChannel.id,
          add: productIds,
        },
      })
    } catch {
      // already linked
    }
  }

  // Link modifiers
  for (const def of PRODUCTS) {
    const productId = byHandle.get(def.handle)
    if (!productId) continue

    if (def.linkExtras) {
      await restaurant.linkModifierGroupToProduct(productId, extras.id, 1)
    }
    if (def.linkPeri && peri) {
      await restaurant.linkModifierGroupToProduct(productId, peri.id, 2)
    }
    if (def.flavors?.length && flavors) {
      await restaurant.linkModifierGroupToProduct(productId, flavors.id, 1)
    }
  }

  // Brand content defaults (ar)
  try {
    const row = await restaurant.getOrCreateContent("brand", "ar")
    const current = (row.content_json || {}) as Record<string, unknown>
    if (!current.brand_name) {
      await restaurant.updateRestaurantContents({
        id: row.id,
        content_json: {
          brand_name: "Umami",
          hero: {
            title: "Umami",
            subtitle: "رامن وأطباق يابانية في المنامة",
            cta_label: "عرض القائمة",
            cta_href: "/store",
          },
        },
      })
      logger.info("Seeded brand content (ar)")
    }
  } catch (e) {
    logger.warn(`Brand content skip: ${String(e)}`)
  }

  logger.info("=== Umami Manama menu seed complete ===")
}
