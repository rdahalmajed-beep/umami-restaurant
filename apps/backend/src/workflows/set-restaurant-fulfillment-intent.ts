import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  releaseLockStep,
} from "@medusajs/medusa/core-flows"
import {
  setRestaurantFulfillmentIntentStep,
  SetRestaurantFulfillmentIntentInput,
} from "./steps/set-restaurant-fulfillment-intent"

/**
 * Canonical path to set branch + order type + matching shipping method together.
 */
export const setRestaurantFulfillmentIntentWorkflow = createWorkflow(
  "set-restaurant-fulfillment-intent",
  (input: SetRestaurantFulfillmentIntentInput) => {
    const lockKey = transform(
      input,
      (data) => `cart:${data.cart_id}:restaurant-intent`
    )

    acquireLockStep({
      key: lockKey,
      timeout: 5,
      ttl: 30,
    }).config({ name: "lock-restaurant-intent" })

    const result = setRestaurantFulfillmentIntentStep(input)

    releaseLockStep({
      key: lockKey,
    }).config({ name: "unlock-restaurant-intent" })

    return new WorkflowResponse(result)
  }
)
