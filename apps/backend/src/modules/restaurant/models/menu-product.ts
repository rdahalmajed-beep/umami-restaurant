import { model } from "@medusajs/framework/utils"
import MenuSection from "./menu-section"

const MenuProduct = model.define("restaurant_menu_product", {
  id: model.id().primaryKey(),
  product_id: model.text().searchable(),
  sort_order: model.number().default(0),
  is_featured: model.boolean().default(false),
  badge: model.text().nullable(),
  badge_i18n_json: model.json().nullable(),
  display_title: model.text().nullable(),
  display_title_i18n_json: model.json().nullable(),
  display_subtitle: model.text().nullable(),
  variant_ids_json: model.json().nullable(),
  schedule_json: model.json().nullable(),
  is_active: model.boolean().default(true),
  // eslint-disable-next-line @medusajs/link-no-cross-module-relationship -- same restaurant module
  section: model.belongsTo(() => MenuSection, { mappedBy: "products" }),
})

export default MenuProduct
