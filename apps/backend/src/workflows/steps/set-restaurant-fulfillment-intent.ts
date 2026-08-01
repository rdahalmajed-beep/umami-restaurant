import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  addShippingMethodToCartWorkflow,
  listShippingOptionsForCartWorkflow,
} from "@medusajs/medusa/core-flows"
import { RESTAURANT_MODULE } from "../../modules/restaurant"
import RestaurantModuleService from "../../modules/restaurant/service"
import { selectShippingOptionForIntent } from "../../modules/restaurant/fulfillment-intent"
import type { RestaurantOrderMetadata } from "../../modules/restaurant/types"

export type SetRestaurantFulfillmentIntentInput = {
  cart_id: string
  branch_id: string
  order_type: "delivery" | "pickup"
  delivery_zone_id?: string
  customer_note?: string
}

export const setRestaurantFulfillmentIntentStep = createStep(
  "set-restaurant-fulfillment-intent",
  async (input: SetRestaurantFulfillmentIntentInput, { container }) => {
    const restaurant: RestaurantModuleService =
      container.resolve(RESTAURANT_MODULE)
    const cartModule = container.resolve(Modules.CART)
    const eventBus = container.resolve(Modules.EVENT_BUS)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const branch = await restaurant.retrieveBranch(input.branch_id)

    if (!branch.is_active) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "RESTAURANT_BRANCH_CLOSED: Selected branch is not active"
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

    // Always persist intent first. Shipping options often aren't available until
    // the cart has an address/region — do not block metadata on that.
    let shippingOptionId: string | undefined
    let shippingApplied = false

    try {
      const { result: shippingOptions } =
        await listShippingOptionsForCartWorkflow(container).run({
          input: { cart_id: input.cart_id },
        })

      if (shippingOptions?.length) {
        const selected = selectShippingOptionForIntent(
          shippingOptions as {
            id: string
            name?: string | null
            amount?: number | null
            type?: { code?: string | null; label?: string | null } | null
          }[],
          input.order_type
        )
        shippingOptionId = selected.id

        await addShippingMethodToCartWorkflow(container).run({
          input: {
            cart_id: input.cart_id,
            options: [{ id: selected.id }],
          },
        })
        shippingApplied = true
      } else {
        logger.info(
          `[restaurant-intent] No shipping options yet for cart ${input.cart_id}; saved metadata only`
        )
      }
    } catch (err) {
      logger.warn(
        `[restaurant-intent] Shipping apply skipped for cart ${input.cart_id}: ${
          err instanceof Error ? err.message : err
        }`
      )
    }

    const restaurantMeta: RestaurantOrderMetadata = {
      order_type: input.order_type,
      branch_id: branch.id,
      branch_name: branch.name,
      customer_note: input.customer_note?.trim() || undefined,
      estimated_preparation_minutes:
        (branch as { prep_override_minutes?: number | null })
          .prep_override_minutes ?? branch.preparation_minutes,
      shipping_option_id: shippingOptionId,
      delivery_zone_id: input.delivery_zone_id,
      intent_updated_at: new Date().toISOString(),
    }

    if (input.order_type === "delivery" && input.delivery_zone_id) {
      const zones = await restaurant.listDeliveryZones({
        id: input.delivery_zone_id,
        branch_id: branch.id,
      })
      const zone = zones[0]
      if (zone) {
        const cartForSubtotal = await cartModule.retrieveCart(input.cart_id)
        const subtotal = Number(
          (cartForSubtotal as { subtotal?: number }).subtotal || 0
        )
        const fee =
          zone.free_threshold != null &&
          subtotal >= Number(zone.free_threshold)
            ? 0
            : Number(zone.fee_amount || 0)
        restaurantMeta.delivery_fee = fee
        restaurantMeta.min_order_amount = Number(zone.min_order_amount || 0)
      }
    }

    const cart = await cartModule.retrieveCart(input.cart_id)
    const prevMeta = (cart.metadata || {}) as Record<string, unknown>

    await cartModule.updateCarts(input.cart_id, {
      metadata: {
        ...prevMeta,
        restaurant: restaurantMeta,
      },
    })

    const updated = await cartModule.retrieveCart(input.cart_id, {
      relations: ["shipping_methods", "items"],
    })

    try {
      await eventBus.emit({
        name: "restaurant.cart_fulfillment_intent.updated",
        data: {
          cart_id: input.cart_id,
          branch_id: branch.id,
          order_type: input.order_type,
          shipping_option_id: shippingOptionId ?? null,
          shipping_applied: shippingApplied,
        },
      })
    } catch (err) {
      logger.warn(
        `Failed to emit restaurant.cart_fulfillment_intent.updated: ${
          err instanceof Error ? err.message : err
        }`
      )
    }

    return new StepResponse({
      cart: updated,
      restaurant: restaurantMeta,
      shipping_option_id: shippingOptionId ?? null,
    })
  }
)
