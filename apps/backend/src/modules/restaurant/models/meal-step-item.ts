import { model } from "@medusajs/framework/utils"
import MealStep from "./meal-step"

const MealStepItem = model.define("restaurant_meal_step_item", {
  id: model.id().primaryKey(),
  product_id: model.text().searchable(),
  variant_id: model.text().nullable(),
  label: model.text().nullable(),
  label_i18n_json: model.json().nullable(),
  upgrade_price: model.number().default(0),
  is_default: model.boolean().default(false),
  substitute_product_id: model.text().nullable(),
  sort_order: model.number().default(0),
  is_active: model.boolean().default(true),
  // eslint-disable-next-line @medusajs/link-no-cross-module-relationship -- same module
  step: model.belongsTo(() => MealStep, { mappedBy: "items" }),
})

export default MealStepItem
