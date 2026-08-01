/**
 * Restaurant fields stored on cart/order metadata.restaurant
 * (snapshot + fulfillment intent — not durable domain source of truth).
 */
export type RestaurantOrderMetadata = {
  order_type: "delivery" | "pickup"
  branch_id: string
  branch_name?: string
  customer_note?: string
  estimated_preparation_minutes?: number
  /** Shipping option chosen by setRestaurantFulfillmentIntentWorkflow */
  shipping_option_id?: string
  delivery_zone_id?: string
  /** Authoritative delivery fee from restaurant_delivery_zone (FUL-UX-001) */
  delivery_fee?: number
  min_order_amount?: number
  intent_updated_at?: string
  guest_access_token?: string
}

export type {
  ModifierSnapshotItem,
  RestaurantOrderStatus,
  ValidatedModifiersResult,
} from "./domain-rules"

/** Alias used by cart line metadata / validate-modifiers step */
export type LineItemModifierSnapshot = import("./domain-rules").ModifierSnapshotItem

export type RestaurantLineItemMetadata = {
  restaurant_modifiers?: LineItemModifierSnapshot[]
  restaurant_note?: string
  base_unit_price?: number
  modifiers_unit_price?: number
}
