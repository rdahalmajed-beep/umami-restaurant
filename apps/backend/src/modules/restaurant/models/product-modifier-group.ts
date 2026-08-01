import { model } from "@medusajs/framework/utils"
import ModifierGroup from "./modifier-group"

/**
 * Product ↔ modifier group with optional per-product overrides (MOD-002).
 */
const ProductModifierGroup = model.define("restaurant_product_modifier_group", {
  id: model.id().primaryKey(),
  product_id: model.text().searchable(),
  sort_order: model.number().default(0),
  is_required_override: model.boolean().nullable(),
  min_selections_override: model.number().nullable(),
  max_selections_override: model.number().nullable(),
  variant_ids_json: model.json().nullable(),
  branch_ids_json: model.json().nullable(),
  // eslint-disable-next-line @medusajs/link-no-cross-module-relationship -- same restaurant module
  modifier_group: model.belongsTo(() => ModifierGroup, {
    mappedBy: "product_links",
  }),
})

export default ProductModifierGroup
