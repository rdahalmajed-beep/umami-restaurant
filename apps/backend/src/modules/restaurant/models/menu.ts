import { model } from "@medusajs/framework/utils"
import MenuSection from "./menu-section"

const Menu = model
  .define("restaurant_menu", {
    id: model.id().primaryKey(),
    title: model.text().searchable(),
    subtitle: model.text().nullable(),
    title_i18n_json: model.json().nullable(),
    subtitle_i18n_json: model.json().nullable(),
    status: model.enum(["draft", "published", "archived"]).default("draft"),
    sort_order: model.number().default(0),
    applies_delivery: model.boolean().default(true),
    applies_pickup: model.boolean().default(true),
    branch_ids_json: model.json().nullable(),
    schedule_json: model.json().nullable(),
    published_at: model.dateTime().nullable(),
    version: model.number().default(1),
    // eslint-disable-next-line @medusajs/link-no-cross-module-relationship -- same restaurant module
    sections: model.hasMany(() => MenuSection, { mappedBy: "menu" }),
  })
  .cascades({ delete: ["sections"] })

export default Menu
