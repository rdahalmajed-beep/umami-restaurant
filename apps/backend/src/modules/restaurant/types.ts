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
