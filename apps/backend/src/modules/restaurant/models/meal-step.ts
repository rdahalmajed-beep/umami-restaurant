import { model } from "@medusajs/framework/utils"
import Meal from "./meal"
import MealStepItem from "./meal-step-item"

const MealStep = model
  .define("restaurant_meal_step", {
    id: model.id().primaryKey(),
    title: model.text(),
    title_i18n_json: model.json().nullable(),
    instruction: model.text().nullable(),
    instruction_i18n_json: model.json().nullable(),
    sort_order: model.number().default(0),
    min_selections: model.number().default(1),
    max_selections: model.number().default(1),
    allow_repeat: model.boolean().default(false),
    // eslint-disable-next-line @medusajs/link-no-cross-module-relationship -- same module
    meal: model.belongsTo(() => Meal, { mappedBy: "steps" }),
    // eslint-disable-next-line @medusajs/link-no-cross-module-relationship -- same module
    items: model.hasMany(() => MealStepItem, { mappedBy: "step" }),
  })
  .cascades({ delete: ["items"] })

export default MealStep
