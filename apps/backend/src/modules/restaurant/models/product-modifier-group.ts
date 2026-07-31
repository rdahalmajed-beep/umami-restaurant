import { model } from "@medusajs/framework/utils"
import ModifierGroup from "./modifier-group"

/**
 * Links a Medusa product_id to a modifier group (product IDs stored as text).
 */
const ProductModifierGroup = model.define("restaurant_product_modifier_group", {
  id: model.id().primaryKey(),
  product_id: model.text().searchable(),
  sort_order: model.number().default(0),
  // eslint-disable-next-line @medusajs/link-no-cross-module-relationship -- same restaurant module
  modifier_group: model.belongsTo(() => ModifierGroup, {
    mappedBy: "product_links",
  }),
})

export default ProductModifierGroup
