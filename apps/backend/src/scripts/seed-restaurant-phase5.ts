/**
 * Idempotent Phase 5 restaurant module seed:
 * - Main Branch (restaurant module)
 * - Modifier groups: Choose Cheese, Extras
 * - Link both to Classic Beef Burger
 */

import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RESTAURANT_MODULE } from "../modules/restaurant"
import RestaurantModuleService from "../modules/restaurant/service"

const BRANCH_SLUG = "main-branch"
const BURGER_HANDLE = "classic-beef-burger"

const CHEESE_GROUP = "Choose Cheese"
const EXTRAS_GROUP = "Extras"

export default async function seedRestaurantPhase5({
  container,
}: {
  container: MedusaContainer
}): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const restaurant: RestaurantModuleService =
    container.resolve(RESTAURANT_MODULE)

  logger.info("=== Umami restaurant Phase 5 seed (branch + modifiers) ===")

  // --- Branch ---
  const existingBranches = await restaurant.listBranches({ slug: BRANCH_SLUG })
  let branch = existingBranches[0]
  if (!branch) {
    ;[branch] = await restaurant.createBranches([
      {
        name: "Main Branch",
        slug: BRANCH_SLUG,
        phone: "+97317000000",
        address: "Manama, Bahrain",
        is_active: true,
        accepts_delivery: true,
        accepts_pickup: true,
        preparation_minutes: 20,
        opening_hours_json: {
          sun: "10:00-23:00",
          mon: "10:00-23:00",
          tue: "10:00-23:00",
          wed: "10:00-23:00",
          thu: "10:00-23:00",
          fri: "10:00-00:00",
          sat: "10:00-00:00",
        },
      },
    ])
    logger.info(`Created branch ${branch.name} (${branch.id})`)
  } else {
    logger.info(`Reused branch ${branch.name} (${branch.id})`)
  }

  // --- Choose Cheese ---
  let cheeseGroups = await restaurant.listModifierGroups(
    { name: CHEESE_GROUP },
    { relations: ["options"] }
  )
  let cheese = cheeseGroups[0]
  if (!cheese) {
    ;[cheese] = await restaurant.createModifierGroups([
      {
        name: CHEESE_GROUP,
        selection_type: "single",
        is_required: true,
        min_selections: 1,
        max_selections: 1,
        sort_order: 1,
      },
    ])
    await restaurant.createModifierOptions([
      {
        name: "No Cheese",
        price_adjustment: 0,
        is_default: true,
        is_active: true,
        sort_order: 1,
        group_id: cheese.id,
      },
      {
        name: "Cheddar",
        price_adjustment: 0.3,
        is_default: false,
        is_active: true,
        sort_order: 2,
        group_id: cheese.id,
      },
      {
        name: "Swiss",
        price_adjustment: 0.4,
        is_default: false,
        is_active: true,
        sort_order: 3,
        group_id: cheese.id,
      },
    ])
    logger.info(`Created modifier group ${CHEESE_GROUP}`)
  } else {
    logger.info(`Reused modifier group ${CHEESE_GROUP}`)
  }

  // --- Extras ---
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
        max_selections: 3,
        sort_order: 2,
      },
    ])
    await restaurant.createModifierOptions([
      {
        name: "Extra Patty",
        price_adjustment: 1.0,
        is_default: false,
        is_active: true,
        sort_order: 1,
        group_id: extras.id,
      },
      {
        name: "Jalapeño",
        price_adjustment: 0.2,
        is_default: false,
        is_active: true,
        sort_order: 2,
        group_id: extras.id,
      },
      {
        name: "Extra Sauce",
        price_adjustment: 0.15,
        is_default: false,
        is_active: true,
        sort_order: 3,
        group_id: extras.id,
      },
    ])
    logger.info(`Created modifier group ${EXTRAS_GROUP}`)
  } else {
    logger.info(`Reused modifier group ${EXTRAS_GROUP}`)
  }

  // Refresh IDs in case reused
  cheeseGroups = await restaurant.listModifierGroups({ name: CHEESE_GROUP })
  extrasGroups = await restaurant.listModifierGroups({ name: EXTRAS_GROUP })
  cheese = cheeseGroups[0]
  extras = extrasGroups[0]

  // --- Link to Classic Beef Burger ---
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title"],
    filters: { handle: BURGER_HANDLE },
  })

  const burger = products?.[0] as { id: string; title: string } | undefined
  if (!burger) {
    logger.warn(
      `Product ${BURGER_HANDLE} not found — skip modifier links (run commerce seed first)`
    )
    return
  }

  await restaurant.linkModifierGroupToProduct(burger.id, cheese.id, 1)
  await restaurant.linkModifierGroupToProduct(burger.id, extras.id, 2)
  logger.info(
    `Linked ${CHEESE_GROUP} + ${EXTRAS_GROUP} → ${burger.title} (${burger.id})`
  )

  logger.info("=== Phase 5 seed complete ===")
}
