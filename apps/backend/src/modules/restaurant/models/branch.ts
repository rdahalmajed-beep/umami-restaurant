import { model } from "@medusajs/framework/utils"

const Branch = model.define("restaurant_branch", {
  id: model.id().primaryKey(),
  name: model.text().searchable(),
  slug: model.text().unique(),
  phone: model.text().nullable(),
  address: model.text().nullable(),
  is_active: model.boolean().default(true),
  accepts_delivery: model.boolean().default(true),
  accepts_pickup: model.boolean().default(true),
  preparation_minutes: model.number().default(20),
  opening_hours_json: model.json().nullable(),
})

export default Branch
