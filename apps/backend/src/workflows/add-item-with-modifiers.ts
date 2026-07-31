import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  addToCartWorkflow,
  acquireLockStep,
  releaseLockStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import { QueryContext } from "@medusajs/framework/utils"
import { validateModifiersStep } from "./steps/validate-modifiers"

export type AddItemWithModifiersWorkflowInput = {
  cart_id: string
  variant_id: string
  quantity: number
  option_ids?: string[]
  note?: string
}

export const addItemWithModifiersWorkflow = createWorkflow(
  "add-item-with-modifiers",
  (input: AddItemWithModifiersWorkflowInput) => {
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      filters: { id: input.cart_id },
      fields: ["id", "currency_code"],
      options: { throwIfKeyNotFound: true },
    }).config({ name: "retrieve-cart-for-modifiers" })

    const { data: variants } = useQueryGraphStep({
      entity: "variant",
      fields: [
        "id",
        "product_id",
        "calculated_price.*",
      ],
      filters: { id: input.variant_id },
      options: { throwIfKeyNotFound: true },
      context: {
        calculated_price: QueryContext({
          currency_code: carts[0].currency_code,
        }),
      },
    }).config({ name: "retrieve-variant-for-modifiers" })

    const validationInput = transform({ input, variants }, (data) => {
      const variant = data.variants[0] as {
        id: string
        product_id: string
        calculated_price?: { calculated_amount?: number | null }
      }
      const base =
        variant.calculated_price?.calculated_amount ?? null
      return {
        product_id: variant.product_id,
        option_ids: data.input.option_ids || [],
        base_unit_price: base as number,
        note: data.input.note,
      }
    })

    const validated = validateModifiersStep(validationInput)

    const itemToAdd = transform({ input, validated }, (data) => [
      {
        variant_id: data.input.variant_id,
        quantity: data.input.quantity,
        unit_price: data.validated.unit_price,
        metadata: data.validated.metadata,
        is_custom_price: true,
      },
    ])

    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    })

    addToCartWorkflow.runAsStep({
      input: {
        cart_id: input.cart_id,
        items: itemToAdd,
      },
    })

    const { data: updatedCarts } = useQueryGraphStep({
      entity: "cart",
      filters: { id: input.cart_id },
      fields: [
        "id",
        "currency_code",
        "subtotal",
        "total",
        "items.*",
        "items.metadata",
        "items.unit_price",
        "items.quantity",
        "items.title",
        "items.variant_id",
      ],
      options: { throwIfKeyNotFound: true },
    }).config({ name: "retrieve-cart-after-modifiers" })

    releaseLockStep({
      key: input.cart_id,
    })

    return new WorkflowResponse({
      cart: updatedCarts[0],
    })
  }
)
