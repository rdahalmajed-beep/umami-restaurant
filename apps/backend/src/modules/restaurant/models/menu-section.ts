import { model } from "@medusajs/framework/utils"
import Menu from "./menu"
import MenuProduct from "./menu-product"

const MenuSection = model
  .define("restaurant_menu_section", {
    id: model.id().primaryKey(),
    title: model.text().searchable(),
    subtitle: model.text().nullable(),
    title_i18n_json: model.json().nullable(),
    subtitle_i18n_json: model.json().nullable(),
    image_url: model.text().nullable(),
    sort_order: model.number().default(0),
    is_active: model.boolean().default(true),
    schedule_json: model.json().nullable(),
    // eslint-disable-next-line @medusajs/link-no-cross-module-relationship -- same restaurant module
    menu: model.belongsTo(() => Menu, { mappedBy: "sections" }),
    // eslint-disable-next-line @medusajs/link-no-cross-module-relationship -- same restaurant module
    products: model.hasMany(() => MenuProduct, { mappedBy: "section" }),
  })
  .cascades({ delete: ["products"] })

export default MenuSection
