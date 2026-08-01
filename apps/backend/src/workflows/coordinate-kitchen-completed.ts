import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { RESTAURANT_MODULE } from "../modules/restaurant"
import type RestaurantModuleService from "../modules/restaurant/service"

/**
 * Explicit kitchen→commerce coordination stub (ORD-006 / Phase 6).
 * When kitchen marks completed, enqueue fulfillment intent — does NOT silently
 * map kitchen status onto Medusa payment state.
 */
const coordinateOnCompletedStep = createStep(
  "coordinate-kitchen-completed",
  async (
    input: { order_id: string; note?: string | null },
    { container }
  ) => {
    const restaurant: RestaurantModuleService =
      container.resolve(RESTAURANT_MODULE)
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const orderModule = container.resolve(Modules.ORDER)

    const row = await restaurant.getRestaurantOrderByOrderId(input.order_id)
    if (!row || row.status !== "completed") {
      return new StepResponse({
        skipped: true as boolean,
        reason: "not_completed" as string | undefined,
        order_id: undefined as string | undefined,
      })
    }

    await restaurant.enqueueOutbox({
      event_type: "commerce.fulfillment.requested",
      idempotency_key: `fulfillment:${input.order_id}:${row.version}`,
      payload: {
        order_id: input.order_id,
        restaurant_order_id: row.id,
        note: input.note || null,
      },
    })

    try {
      // Soft annotation only — do not capture payment or invent fulfillment here.
      const order = await orderModule.retrieveOrder(input.order_id)
      const meta = (order.metadata || {}) as Record<string, unknown>
      await orderModule.updateOrders(input.order_id, {
        metadata: {
          ...meta,
          restaurant_kitchen_completed_at: new Date().toISOString(),
        },
      })
    } catch (err) {
      logger.warn(
        `coordinate-kitchen-completed metadata skip: ${
          err instanceof Error ? err.message : err
        }`
      )
    }

    await restaurant.writeAuditLog({
      actor_id: "system",
      action: "commerce.fulfillment.requested",
      resource_type: "order",
      resource_id: input.order_id,
      after: { kitchen_status: "completed" },
    })

    return new StepResponse({
      skipped: false as boolean,
      reason: undefined as string | undefined,
      order_id: input.order_id as string | undefined,
    })
  }
)

export const coordinateKitchenCompletedWorkflow = createWorkflow(
  "coordinate-kitchen-completed",
  (input: { order_id: string; note?: string | null }) => {
    const result = coordinateOnCompletedStep(input)
    return new WorkflowResponse(result)
  }
)
