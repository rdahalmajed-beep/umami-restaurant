/**
 * Idempotent restaurant commerce seed for Umami MVP Phase 2 + Phase 3.
 *
 * Creates / reuses:
 * - Store: Restaurant Demo (BHD default)
 * - Sales channel: Web Store
 * - Publishable API key linked to Web Store
 * - Region: Bahrain (BHD, country bh)
 * - Stock location: Main Branch
 * - Shipping: Delivery 1.000 BHD, Pickup 0.000 BHD
 * - Phase 3 catalog: 4 categories, 4 published products, variants, images, BHD prices
 *
 * Run via:
 *   pnpm medusa exec ./src/scripts/seed-restaurant-commerce.ts
 * Or automatically from migration-scripts/initial-data-seed.ts on fresh migrate.
 */

import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkProductsToSalesChannelWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateProductsWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

const STORE_NAME = "Restaurant Demo"
const SALES_CHANNEL_NAME = "Web Store"
const REGION_NAME = "Bahrain"
const STOCK_LOCATION_NAME = "Main Branch"
const FULFILLMENT_SET_NAME = "Main Branch Fulfillment"
const PUBLISHABLE_KEY_TITLE = "Web Store Publishable Key"
const COUNTRY_CODE = "bh"
const CURRENCY_CODE = "bhd"

/** Prices in major BHD units (Medusa stores decimals; BHD has 3 decimal digits). */
const BHD = {
  delivery: 1.0,
  pickup: 0.0,
  burgerRegular: 2.8,
  burgerDouble: 3.8,
  chickenMeal: 3.5,
  friesRegular: 1.0,
  friesLarge: 1.4,
  softDrink: 0.7,
} as const

/** Phase 3 demo images (Unsplash placeholders). */
const IMG = {
  burger:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  chicken:
    "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80",
  fries:
    "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80",
  drink:
    "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80",
} as const

const RESTAURANT_HANDLES = [
  "classic-beef-burger",
  "crispy-chicken-meal",
  "french-fries",
  "soft-drink",
] as const

type SeedSummary = {
  storeId: string
  salesChannelId: string
  regionId: string
  stockLocationId: string
  publishableApiKey: string | null
  created: string[]
  reused: string[]
}

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

export default async function seedRestaurantCommerce({
  container,
}: {
  container: MedusaContainer
}): Promise<SeedSummary> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  )

  const created: string[] = []
  const reused: string[] = []

  logger.info("=== Umami restaurant commerce seed (Phase 2 + 3) ===")

  // --- Sales channel: Web Store ---
  let salesChannel = await findOne<{ id: string; name: string }>(
    query,
    "sales_channel",
    ["id", "name"],
    { name: SALES_CHANNEL_NAME }
  )

  if (!salesChannel) {
    const defaultChannel = await findOne<{ id: string; name: string }>(
      query,
      "sales_channel",
      ["id", "name"],
      { name: "Default Sales Channel" }
    )

    if (defaultChannel) {
      const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
      await salesChannelModule.updateSalesChannels(defaultChannel.id, {
        name: SALES_CHANNEL_NAME,
        description: "Restaurant web ordering channel",
      })
      salesChannel = { id: defaultChannel.id, name: SALES_CHANNEL_NAME }
      created.push(`renamed sales channel → ${SALES_CHANNEL_NAME}`)
    } else {
      const {
        result: [sc],
      } = await createSalesChannelsWorkflow(container).run({
        input: {
          salesChannelsData: [
            {
              name: SALES_CHANNEL_NAME,
              description: "Restaurant web ordering channel",
            },
          ],
        },
      })
      salesChannel = sc
      created.push(`sales channel ${SALES_CHANNEL_NAME}`)
    }
  } else {
    reused.push(`sales channel ${SALES_CHANNEL_NAME}`)
  }

  // --- Publishable API key ---
  let publishableToken: string | null = null
  const { data: existingKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "token", "type"],
    filters: { type: "publishable" },
  })

  let publishableKey = existingKeys?.[0] as
    | { id: string; title: string; token: string }
    | undefined

  if (!publishableKey) {
    const {
      result: [key],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: PUBLISHABLE_KEY_TITLE,
            type: "publishable",
            created_by: "",
          },
        ],
      },
    })
    publishableKey = key as { id: string; title: string; token: string }
    created.push("publishable API key")
  } else {
    reused.push("publishable API key")
  }

  publishableToken = publishableKey.token ?? null

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableKey.id,
      add: [salesChannel.id],
    },
  })

  // --- Store: Restaurant Demo + BHD ---
  const { data: stores } = await query.graph({
    entity: "store",
    fields: [
      "id",
      "name",
      "supported_currencies.*",
      "default_sales_channel_id",
    ],
  })

  let storeId: string

  if (!stores?.length) {
    const {
      result: [store],
    } = await createStoresWorkflow(container).run({
      input: {
        stores: [
          {
            name: STORE_NAME,
            supported_currencies: [
              { currency_code: CURRENCY_CODE, is_default: true },
            ],
            default_sales_channel_id: salesChannel.id,
          },
        ],
      },
    })
    storeId = store.id
    created.push(`store ${STORE_NAME}`)
  } else {
    storeId = stores[0].id
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: storeId },
        update: {
          name: STORE_NAME,
          supported_currencies: [
            { currency_code: CURRENCY_CODE, is_default: true },
          ],
          default_sales_channel_id: salesChannel.id,
        },
      },
    })
    created.push(`updated store → ${STORE_NAME} (BHD)`)
  }

  // --- Region: Bahrain ---
  let region = await findOne<{ id: string; name: string; currency_code: string }>(
    query,
    "region",
    ["id", "name", "currency_code"],
    { name: REGION_NAME }
  )

  if (!region) {
    // Europe seed may own other countries; bh is free. Still remove bh from any region if present.
    const { data: allRegions } = await query.graph({
      entity: "region",
      fields: ["id", "name", "countries.iso_2"],
    })

    for (const r of allRegions ?? []) {
      const countries = (r as { countries?: { iso_2: string }[] }).countries ?? []
      if (countries.some((c) => c.iso_2 === COUNTRY_CODE)) {
        const regionModule = container.resolve(Modules.REGION)
        await regionModule.updateRegions(r.id, {
          countries: countries
            .map((c) => c.iso_2)
            .filter((code) => code !== COUNTRY_CODE),
        })
      }
    }

    const { result: regionResult } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: REGION_NAME,
            currency_code: CURRENCY_CODE,
            countries: [COUNTRY_CODE],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    region = regionResult[0]
    created.push(`region ${REGION_NAME}`)
  } else {
    reused.push(`region ${REGION_NAME}`)
  }

  // Ensure system/test payment provider is linked (idempotent for reused regions)
  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: region.id },
      update: {
        payment_providers: ["pp_system_default"],
      },
    },
  })
  created.push("region payment provider pp_system_default")

  // Tax region for Bahrain (system provider, no real tax claim)
  const existingTax = await findOne<{ id: string }>(
    query,
    "tax_region",
    ["id"],
    { country_code: COUNTRY_CODE }
  )
  if (!existingTax) {
    await createTaxRegionsWorkflow(container).run({
      input: [
        {
          country_code: COUNTRY_CODE,
          provider_id: "tp_system",
        },
      ],
    })
    created.push("tax region bh")
  } else {
    reused.push("tax region bh")
  }

  // --- Stock location: Main Branch ---
  let stockLocation = await findOne<{ id: string; name: string }>(
    query,
    "stock_location",
    ["id", "name"],
    { name: STOCK_LOCATION_NAME }
  )

  if (!stockLocation) {
    const {
      result: [loc],
    } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: STOCK_LOCATION_NAME,
            address: {
              city: "Manama",
              country_code: "BH",
              address_1: "Main Branch",
            },
          },
        ],
      },
    })
    stockLocation = loc
    created.push(`stock location ${STOCK_LOCATION_NAME}`)
  } else {
    reused.push(`stock location ${STOCK_LOCATION_NAME}`)
  }

  // Link manual fulfillment provider
  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    })
  } catch {
    // already linked
  }

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [salesChannel.id],
    },
  })

  // --- Fulfillment set + shipping options ---
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  })
  const shippingProfile = shippingProfiles?.[0]
  if (!shippingProfile) {
    throw new Error(
      "No shipping profile found. Run migrations before seeding."
    )
  }

  const existingSets =
    await fulfillmentModuleService.listFulfillmentSets(
      { name: FULFILLMENT_SET_NAME },
      { relations: ["service_zones"] }
    )

  let fulfillmentSet = existingSets?.[0]

  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: FULFILLMENT_SET_NAME,
      type: "shipping",
      service_zones: [
        {
          name: REGION_NAME,
          geo_zones: [
            {
              country_code: COUNTRY_CODE,
              type: "country",
            },
          ],
        },
      ],
    })
    created.push(`fulfillment set ${FULFILLMENT_SET_NAME}`)
  } else {
    reused.push(`fulfillment set ${FULFILLMENT_SET_NAME}`)
  }

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    })
  } catch {
    // already linked
  }

  // Reload with service zones
  const [fulfillmentSetFresh] =
    await fulfillmentModuleService.listFulfillmentSets(
      { id: fulfillmentSet.id },
      { relations: ["service_zones"] }
    )
  const serviceZoneId = fulfillmentSetFresh.service_zones?.[0]?.id
  if (!serviceZoneId) {
    throw new Error("Fulfillment set has no service zone")
  }

  const { data: existingShippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
  })
  const optionNames = new Set(
    (existingShippingOptions ?? []).map((o: { name: string }) => o.name)
  )

  const shippingOptionsToCreate = []

  if (!optionNames.has("Delivery")) {
    shippingOptionsToCreate.push({
      name: "Delivery",
      price_type: "flat" as const,
      provider_id: "manual_manual",
      service_zone_id: serviceZoneId,
      shipping_profile_id: shippingProfile.id,
      type: {
        label: "Delivery",
        description: "Deliver to your address in Bahrain.",
        code: "delivery",
      },
      prices: [
        {
          currency_code: CURRENCY_CODE,
          amount: BHD.delivery,
        },
        {
          region_id: region.id,
          amount: BHD.delivery,
        },
      ],
      rules: [
        {
          attribute: "enabled_in_store",
          value: "true",
          operator: "eq" as const,
        },
        {
          attribute: "is_return",
          value: "false",
          operator: "eq" as const,
        },
      ],
    })
  }

  if (!optionNames.has("Pickup from Main Branch")) {
    shippingOptionsToCreate.push({
      name: "Pickup from Main Branch",
      price_type: "flat" as const,
      provider_id: "manual_manual",
      service_zone_id: serviceZoneId,
      shipping_profile_id: shippingProfile.id,
      type: {
        label: "Pickup",
        description: "Collect your order from Main Branch.",
        code: "pickup",
      },
      prices: [
        {
          currency_code: CURRENCY_CODE,
          amount: BHD.pickup,
        },
        {
          region_id: region.id,
          amount: BHD.pickup,
        },
      ],
      rules: [
        {
          attribute: "enabled_in_store",
          value: "true",
          operator: "eq" as const,
        },
        {
          attribute: "is_return",
          value: "false",
          operator: "eq" as const,
        },
      ],
    })
  }

  if (shippingOptionsToCreate.length) {
    await createShippingOptionsWorkflow(container).run({
      input: shippingOptionsToCreate,
    })
    for (const opt of shippingOptionsToCreate) {
      created.push(`shipping option ${opt.name}`)
    }
  } else {
    reused.push("shipping options Delivery + Pickup")
  }

  // --- Categories (Phase 3 catalog, needed so storefront can list products) ---
  const categoryNames = ["Burgers", "Meals", "Sides", "Drinks"] as const
  const categoryIds: Record<string, string> = {}

  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  })

  for (const name of categoryNames) {
    const found = (existingCategories ?? []).find(
      (c: { name: string }) => c.name === name
    )
    if (found) {
      categoryIds[name] = found.id
      reused.push(`category ${name}`)
    }
  }

  const categoriesToCreate = categoryNames.filter((n) => !categoryIds[n])
  if (categoriesToCreate.length) {
    const { result: createdCats } = await createProductCategoriesWorkflow(
      container
    ).run({
      input: {
        product_categories: categoriesToCreate.map((name) => ({
          name,
          is_active: true,
        })),
      },
    })
    for (const cat of createdCats) {
      categoryIds[cat.name] = cat.id
      created.push(`category ${cat.name}`)
    }
  }

  // --- Collection (storefront homepage FeaturedProducts uses collections) ---
  let menuCollection = await findOne<{ id: string; title: string; handle: string }>(
    query,
    "product_collection",
    ["id", "title", "handle"],
    { handle: "menu" }
  )

  if (!menuCollection) {
    const {
      result: [collection],
    } = await createCollectionsWorkflow(container).run({
      input: {
        collections: [
          {
            title: "Menu",
            handle: "menu",
          },
        ],
      },
    })
    menuCollection = collection
    created.push("collection Menu")
  } else {
    reused.push("collection Menu")
  }

  // --- Products ---
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "collection_id"],
  })
  const existingHandles = new Set(
    (existingProducts ?? []).map((p: { handle: string }) => p.handle)
  )

  const productsToCreate = []

  if (!existingHandles.has("classic-beef-burger")) {
    productsToCreate.push({
      title: "Classic Beef Burger",
      handle: "classic-beef-burger",
      description: "Beef patty, cheese, lettuce and house sauce.",
      category_ids: [categoryIds.Burgers],
      collection_id: menuCollection.id,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      thumbnail: IMG.burger,
      images: [{ url: IMG.burger }],
      options: [{ title: "Size", values: ["Regular", "Double"] }],
      variants: [
        {
          title: "Regular",
          sku: "BURGER-REGULAR",
          manage_inventory: false,
          options: { Size: "Regular" },
          prices: [{ amount: BHD.burgerRegular, currency_code: CURRENCY_CODE }],
        },
        {
          title: "Double",
          sku: "BURGER-DOUBLE",
          manage_inventory: false,
          options: { Size: "Double" },
          prices: [{ amount: BHD.burgerDouble, currency_code: CURRENCY_CODE }],
        },
      ],
      sales_channels: [{ id: salesChannel.id }],
    })
  }

  if (!existingHandles.has("crispy-chicken-meal")) {
    productsToCreate.push({
      title: "Crispy Chicken Meal",
      handle: "crispy-chicken-meal",
      description: "Crispy chicken sandwich, fries and drink.",
      category_ids: [categoryIds.Meals],
      collection_id: menuCollection.id,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      thumbnail: IMG.chicken,
      images: [{ url: IMG.chicken }],
      options: [{ title: "Drink", values: ["Cola", "Diet Cola"] }],
      variants: [
        {
          title: "Cola",
          sku: "CHICKEN-MEAL-COLA",
          manage_inventory: false,
          options: { Drink: "Cola" },
          prices: [{ amount: BHD.chickenMeal, currency_code: CURRENCY_CODE }],
        },
        {
          title: "Diet Cola",
          sku: "CHICKEN-MEAL-DIET-COLA",
          manage_inventory: false,
          options: { Drink: "Diet Cola" },
          prices: [{ amount: BHD.chickenMeal, currency_code: CURRENCY_CODE }],
        },
      ],
      sales_channels: [{ id: salesChannel.id }],
    })
  }

  if (!existingHandles.has("french-fries")) {
    productsToCreate.push({
      title: "French Fries",
      handle: "french-fries",
      description: "Crispy golden fries.",
      category_ids: [categoryIds.Sides],
      collection_id: menuCollection.id,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      thumbnail: IMG.fries,
      images: [{ url: IMG.fries }],
      options: [{ title: "Size", values: ["Regular", "Large"] }],
      variants: [
        {
          title: "Regular",
          sku: "FRIES-REGULAR",
          manage_inventory: false,
          options: { Size: "Regular" },
          prices: [{ amount: BHD.friesRegular, currency_code: CURRENCY_CODE }],
        },
        {
          title: "Large",
          sku: "FRIES-LARGE",
          manage_inventory: false,
          options: { Size: "Large" },
          prices: [{ amount: BHD.friesLarge, currency_code: CURRENCY_CODE }],
        },
      ],
      sales_channels: [{ id: salesChannel.id }],
    })
  }

  if (!existingHandles.has("soft-drink")) {
    productsToCreate.push({
      title: "Soft Drink",
      handle: "soft-drink",
      description: "Chilled soft drink.",
      category_ids: [categoryIds.Drinks],
      collection_id: menuCollection.id,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfile.id,
      thumbnail: IMG.drink,
      images: [{ url: IMG.drink }],
      options: [{ title: "Type", values: ["Cola", "Diet Cola", "Orange"] }],
      variants: [
        {
          title: "Cola",
          sku: "DRINK-COLA",
          manage_inventory: false,
          options: { Type: "Cola" },
          prices: [{ amount: BHD.softDrink, currency_code: CURRENCY_CODE }],
        },
        {
          title: "Diet Cola",
          sku: "DRINK-DIET-COLA",
          manage_inventory: false,
          options: { Type: "Diet Cola" },
          prices: [{ amount: BHD.softDrink, currency_code: CURRENCY_CODE }],
        },
        {
          title: "Orange",
          sku: "DRINK-ORANGE",
          manage_inventory: false,
          options: { Type: "Orange" },
          prices: [{ amount: BHD.softDrink, currency_code: CURRENCY_CODE }],
        },
      ],
      sales_channels: [{ id: salesChannel.id }],
    })
  }

  if (productsToCreate.length) {
    await createProductsWorkflow(container).run({
      input: { products: productsToCreate },
    })
    for (const p of productsToCreate) {
      created.push(`product ${p.title}`)
    }
  } else {
    reused.push("restaurant demo products")
  }

  // Phase 3 repair: published + Menu collection + Web Store + thumbnails
  const thumbnailByHandle: Record<string, string> = {
    "classic-beef-burger": IMG.burger,
    "crispy-chicken-meal": IMG.chicken,
    "french-fries": IMG.fries,
    "soft-drink": IMG.drink,
  }

  const { data: catalogProducts } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "status",
      "thumbnail",
      "collection_id",
      "sales_channels.id",
    ],
  })

  const restaurantProducts = (catalogProducts ?? []).filter(
    (p: { handle: string }) =>
      (RESTAURANT_HANDLES as readonly string[]).includes(p.handle)
  )

  const productUpdates: {
    id: string
    status?: ProductStatus
    collection_id?: string
    thumbnail?: string
  }[] = []

  const productIdsMissingChannel: string[] = []

  for (const p of restaurantProducts as {
    id: string
    handle: string
    status?: string
    thumbnail?: string | null
    collection_id?: string | null
    sales_channels?: { id: string }[]
  }[]) {
    const update: (typeof productUpdates)[number] = { id: p.id }
    let needsUpdate = false

    if (p.status !== ProductStatus.PUBLISHED && p.status !== "published") {
      update.status = ProductStatus.PUBLISHED
      needsUpdate = true
    }
    if (p.collection_id !== menuCollection.id) {
      update.collection_id = menuCollection.id
      needsUpdate = true
    }
    if (!p.thumbnail && thumbnailByHandle[p.handle]) {
      update.thumbnail = thumbnailByHandle[p.handle]
      needsUpdate = true
    }
    if (needsUpdate) {
      productUpdates.push(update)
    }

    const channelIds = (p.sales_channels ?? []).map((sc) => sc.id)
    if (!channelIds.includes(salesChannel.id)) {
      productIdsMissingChannel.push(p.id)
    }
  }

  if (productUpdates.length) {
    await updateProductsWorkflow(container).run({
      input: { products: productUpdates },
    })
    created.push(`repaired ${productUpdates.length} catalog products`)
  }

  if (productIdsMissingChannel.length) {
    await linkProductsToSalesChannelWorkflow(container).run({
      input: {
        id: salesChannel.id,
        add: productIdsMissingChannel,
      },
    })
    created.push(
      `linked ${productIdsMissingChannel.length} products to Web Store`
    )
  }

  const summary: SeedSummary = {
    storeId,
    salesChannelId: salesChannel.id,
    regionId: region.id,
    stockLocationId: stockLocation.id,
    publishableApiKey: publishableToken,
    created,
    reused,
  }

  logger.info("--- Seed summary ---")
  logger.info(`Store: ${STORE_NAME} (${storeId})`)
  logger.info(`Sales channel: ${SALES_CHANNEL_NAME} (${salesChannel.id})`)
  logger.info(`Region: ${REGION_NAME} / ${CURRENCY_CODE} (${region.id})`)
  logger.info(`Stock location: ${STOCK_LOCATION_NAME} (${stockLocation.id})`)
  if (publishableToken) {
    logger.info(`Publishable API key: ${publishableToken}`)
    logger.info(
      "Set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY and NEXT_PUBLIC_DEFAULT_REGION=bh in storefront .env.local"
    )
  }
  logger.info(`Created: ${created.length ? created.join("; ") : "(none)"}`)
  logger.info(`Reused: ${reused.length ? reused.join("; ") : "(none)"}`)
  logger.info("=== Seed complete ===")

  return summary
}
