import { model } from "@medusajs/framework/utils"
import ModifierGroup from "./modifier-group"

/**
 * price_adjustment is in major currency units (BHD, 3 dp), matching catalog prices.
 */
const ModifierOption = model.define("restaurant_modifier_option", {
  id: model.id().primaryKey(),
  name: model.text().searchable(),
  price_adjustment: model.bigNumber().default(0),
  is_default: model.boolean().default(false),
  is_active: model.boolean().default(true),
  sort_order: model.number().default(0),
  // eslint-disable-next-line @medusajs/link-no-cross-module-relationship -- same restaurant module
  group: model.belongsTo(() => ModifierGroup, {
    mappedBy: "options",
  }),
})

export default ModifierOption
