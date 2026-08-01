import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  releaseLockStep,
} from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { RESTAURANT_MODULE } from "../modules/restaurant"
import type RestaurantModuleService from "../modules/restaurant/service"
import type { RestaurantOrderStatus } from "../modules/restaurant/domain-rules"
import { kitchenEvents } from "../modules/restaurant/kitchen-events"

export type TransitionRestaurantOrderInput = {
  order_id: string
  to_status: RestaurantOrderStatus
  changed_by?: string | null
  note?: string | null
  expected_version?: number | null
}

const transitionRestaurantOrderStep = createStep(
  "transition-restaurant-order-status",
  async (input: TransitionRestaurantOrderInput, { container }) => {
    const restaurant: RestaurantModuleService =
      container.resolve(RESTAURANT_MODULE)
    const eventBus = container.resolve(Modules.EVENT_BUS)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const restaurant_order = await restaurant.transitionRestaurantOrderStatus(
      input
    )

    try {
      await eventBus.emit({
        name: "restaurant.order_status.updated",
        data: {
          order_id: input.order_id,
          restaurant_order_id: restaurant_order.id,
          status: restaurant_order.status,
          version: restaurant_order.version,
          changed_by: input.changed_by ?? null,
        },
      })
    } catch (err) {
      logger.warn(
        `Failed to emit restaurant.order_status.updated: ${
          err instanceof Error ? err.message : err
        }`
      )
    }

    kitchenEvents.emitKitchen({
      type: "order.status_changed",
      order_id: input.order_id,
      restaurant_order_id: restaurant_order.id,
      status: restaurant_order.status,
      version: Number(restaurant_order.version ?? 1),
    })

    return new StepResponse({ restaurant_order })
  }
)

export const transitionRestaurantOrderWorkflow = createWorkflow(
  "transition-restaurant-order",
  (input: TransitionRestaurantOrderInput) => {
    const lockKey = transform(
      input,
      (data) => `restaurant-order:${data.order_id}`
    )

    acquireLockStep({
      key: lockKey,
      timeout: 5,
      ttl: 30,
    })

    const result = transitionRestaurantOrderStep(input)

    releaseLockStep({
      key: lockKey,
    })

    return new WorkflowResponse(result)
  }
)
