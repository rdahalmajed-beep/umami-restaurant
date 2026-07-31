import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { RESTAURANT_MODULE } from "../../modules/restaurant"
import RestaurantModuleService from "../../modules/restaurant/service"
import type {
  LineItemModifierSnapshot,
  RestaurantLineItemMetadata,
} from "../../modules/restaurant/types"

export type ValidateModifiersStepInput = {
  product_id: string
  option_ids: string[]
  base_unit_price: number
  note?: string
}

export type ValidateModifiersStepOutput = {
  unit_price: number
  metadata: RestaurantLineItemMetadata
  snapshot: LineItemModifierSnapshot[]
}

export const validateModifiersStep = createStep(
  "validate-restaurant-modifiers",
  async (input: ValidateModifiersStepInput, { container }) => {
    const restaurant: RestaurantModuleService =
      container.resolve(RESTAURANT_MODULE)

    if (
      typeof input.base_unit_price !== "number" ||
      Number.isNaN(input.base_unit_price)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Missing variant base price for modifier calculation"
      )
    }

    const { snapshot, modifiers_unit_price } =
      await restaurant.validateAndPriceModifiers(
        input.product_id,
        input.option_ids || []
      )

    const unit_price =
      Math.round((input.base_unit_price + modifiers_unit_price) * 1000) / 1000

    const metadata: RestaurantLineItemMetadata = {
      restaurant_modifiers: snapshot,
      restaurant_note: input.note?.trim() || undefined,
      base_unit_price: input.base_unit_price,
      modifiers_unit_price,
    }

    return new StepResponse({
      unit_price,
      metadata,
      snapshot,
    } satisfies ValidateModifiersStepOutput)
  }
)
