/**
 * Shared restaurant order / cart metadata (Phase 5).
 * Kitchen status belongs in Phase 6 — do not store it here permanently.
 */
export type RestaurantOrderMetadata = {
  order_type: "delivery" | "pickup"
  branch_id: string
  branch_name?: string
  customer_note?: string
  estimated_preparation_minutes?: number
}

export type LineItemModifierSnapshot = {
  group_id: string
  group_name: string
  option_id: string
  option_name: string
  price_adjustment: number
}

export type RestaurantLineItemMetadata = {
  restaurant_modifiers: LineItemModifierSnapshot[]
  restaurant_note?: string
  base_unit_price: number
  modifiers_unit_price: number
}
