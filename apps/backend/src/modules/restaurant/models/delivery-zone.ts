import { model } from "@medusajs/framework/utils"

/**
 * Delivery zone per branch (FUL-UX-001). Fees here are authoritative for checkout.
 */
const DeliveryZone = model.define("restaurant_delivery_zone", {
  id: model.id().primaryKey(),
  branch_id: model.text().searchable(),
  name: model.text().searchable(),
  name_i18n_json: model.json().nullable(),
  sort_order: model.number().default(0),
  is_active: model.boolean().default(true),
  /** radius_km | postal | polygon | named */
  geometry_type: model
    .enum(["radius_km", "postal", "polygon", "named"])
    .default("named"),
  geometry_json: model.json().nullable(),
  min_order_amount: model.number().default(0),
  fee_amount: model.number().default(0),
  free_threshold: model.number().nullable(),
  estimated_minutes: model.number().default(30),
  schedule_json: model.json().nullable(),
  medusa_shipping_option_id: model.text().nullable(),
})

export default DeliveryZone
