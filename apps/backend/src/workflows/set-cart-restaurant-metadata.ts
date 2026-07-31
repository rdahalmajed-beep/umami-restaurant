import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  setCartRestaurantMetadataStep,
  SetCartRestaurantMetaInput,
} from "./steps/set-cart-restaurant-metadata"

export const setCartRestaurantMetadataWorkflow = createWorkflow(
  "set-cart-restaurant-metadata",
  (input: SetCartRestaurantMetaInput) => {
    const result = setCartRestaurantMetadataStep(input)
    return new WorkflowResponse(result)
  }
)
