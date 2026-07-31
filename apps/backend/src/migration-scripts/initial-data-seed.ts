import { MedusaContainer } from "@medusajs/framework"
import seedRestaurantCommerce from "../scripts/seed-restaurant-commerce"

/**
 * Fresh-install migration seed. Replaces the Medusa Europe starter seed
 * with Bahrain / BHD restaurant commerce + Phase 3 demo catalog.
 */
export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer
}) {
  await seedRestaurantCommerce({ container })
}
