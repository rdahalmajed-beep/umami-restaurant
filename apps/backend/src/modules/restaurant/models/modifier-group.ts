import { model } from "@medusajs/framework/utils"
import ModifierOption from "./modifier-option"
import ProductModifierGroup from "./product-modifier-group"

const ModifierGroup = model
  .define("restaurant_modifier_group", {
    id: model.id().primaryKey(),
    name: model.text().searchable(),
    selection_type: model.enum(["single", "multiple"]).default("single"),
    is_required: model.boolean().default(false),
    min_selections: model.number().default(0),
    max_selections: model.number().default(1),
    sort_order: model.number().default(0),
    // eslint-disable-next-line @medusajs/link-no-cross-module-relationship -- same restaurant module
    options: model.hasMany(() => ModifierOption, {
      mappedBy: "group",
    }),
    // eslint-disable-next-line @medusajs/link-no-cross-module-relationship -- same restaurant module
    product_links: model.hasMany(() => ProductModifierGroup, {
      mappedBy: "modifier_group",
    }),
  })
  .cascades({
    delete: ["options", "product_links"],
  })

export default ModifierGroup
