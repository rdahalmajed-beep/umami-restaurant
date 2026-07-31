import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { RESTAURANT_MODULE } from "../../modules/restaurant"
import RestaurantModuleService from "../../modules/restaurant/service"
import type { RestaurantOrderMetadata } from "../../modules/restaurant/types"

export type SetCartRestaurantMetaInput = {
  cart_id: string
  order_type: "delivery" | "pickup"
  branch_id: string
  customer_note?: string
}

export const setCartRestaurantMetadataStep = createStep(
  "set-cart-restaurant-metadata",
  async (input: SetCartRestaurantMetaInput, { container }) => {
    const restaurant: RestaurantModuleService =
      container.resolve(RESTAURANT_MODULE)
    const cartModule = container.resolve(Modules.CART)

    const branch = await restaurant.retrieveBranch(input.branch_id)

    if (!branch.is_active) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Selected branch is not active"
      )
    }

    if (input.order_type === "delivery" && !branch.accepts_delivery) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Branch does not accept delivery"
      )
    }

    if (input.order_type === "pickup" && !branch.accepts_pickup) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Branch does not accept pickup"
      )
    }

    const restaurantMeta: RestaurantOrderMetadata = {
      order_type: input.order_type,
      branch_id: branch.id,
      branch_name: branch.name,
      customer_note: input.customer_note?.trim() || undefined,
      estimated_preparation_minutes: branch.preparation_minutes,
    }

    const cart = await cartModule.retrieveCart(input.cart_id)
    const prevMeta = (cart.metadata || {}) as Record<string, unknown>

    await cartModule.updateCarts(input.cart_id, {
      metadata: {
        ...prevMeta,
        restaurant: restaurantMeta,
      },
    })

    return new StepResponse({ restaurant: restaurantMeta })
  }
)
