/**
 * Re-runnable commerce + Phase 5 restaurant module seed.
 *
 *   pnpm medusa exec ./src/scripts/seed.ts
 */
import { MedusaContainer } from "@medusajs/framework"
import seedRestaurantCommerce from "./seed-restaurant-commerce"
import seedRestaurantPhase5 from "./seed-restaurant-phase5"

export default async function seed({
  container,
}: {
  container: MedusaContainer
}) {
  await seedRestaurantCommerce({ container })
  await seedRestaurantPhase5({ container })
}
