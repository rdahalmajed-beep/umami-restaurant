import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { RESTAURANT_MODULE } from "../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../modules/restaurant/service"
import { kitchenEvents } from "../../../../../modules/restaurant/kitchen-events"
import { revalidateStorefrontTags } from "../../../../../modules/restaurant/cache-invalidation"

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  applies_delivery: z.boolean().optional(),
  applies_pickup: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

const SectionSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
})

/**
 * GET/POST /admin/restaurant/menus/:id
 * POST body may include action: "add_section" | "publish" | fields update
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const menu = await restaurant.retrieveMenu(req.params.id, {
    relations: ["sections", "sections.products"],
  })
  res.json({ menu })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = req.body as Record<string, unknown>

  if (body.action === "add_section") {
    const sectionBody = SectionSchema.parse(body)
    const [section] = await restaurant.createMenuSections([
      {
        title: sectionBody.title,
        subtitle: sectionBody.subtitle ?? null,
        sort_order: sectionBody.sort_order ?? 0,
        menu_id: req.params.id,
      },
    ])
    res.status(201).json({ section })
    return
  }

  if (body.action === "attach_product") {
    const section_id = String(body.section_id || "")
    const product_id = String(body.product_id || "")
    if (!section_id || !product_id) {
      res.status(400).json({ message: "section_id and product_id required" })
      return
    }
    const [row] = await restaurant.createMenuProducts([
      {
        section_id,
        product_id,
        sort_order: Number(body.sort_order || 0),
        is_featured: !!body.is_featured,
        badge: (body.badge as string) || null,
      },
    ])
    res.status(201).json({ menu_product: row })
    return
  }

  if (body.action === "update_section") {
    const section_id = String(body.section_id || "")
    if (!section_id) {
      res.status(400).json({ message: "section_id required" })
      return
    }
    const patch: Record<string, unknown> = { id: section_id }
    if (typeof body.title === "string") patch.title = body.title
    if (body.title_i18n_json !== undefined) {
      patch.title_i18n_json = body.title_i18n_json
    }
    if (body.subtitle !== undefined) patch.subtitle = body.subtitle
    if (body.sort_order !== undefined) {
      patch.sort_order = Number(body.sort_order)
    }
    const section = await restaurant.updateMenuSections(patch)
    res.json({ section })
    return
  }

  if (body.action === "reorder_product") {
    const menu_product_id = String(body.menu_product_id || "")
    if (!menu_product_id) {
      res.status(400).json({ message: "menu_product_id required" })
      return
    }
    const row = await restaurant.updateMenuProducts({
      id: menu_product_id,
      sort_order: Number(body.sort_order || 0),
    })
    res.json({ menu_product: row })
    return
  }

  if (body.action === "publish") {
    const menu = await restaurant.updateMenus({
      id: req.params.id,
      status: "published",
      published_at: new Date(),
    })
    kitchenEvents.emitKitchen({ type: "settings.updated" })
    await restaurant.writeAuditLog({
      action: "menu.publish",
      resource_type: "menu",
      resource_id: req.params.id,
      after: { status: "published" },
    })
    await revalidateStorefrontTags(["restaurant-menu", "restaurant-content"])
    res.json({ menu })
    return
  }

  const patch = UpdateSchema.parse(body)
  const menu = await restaurant.updateMenus({
    id: req.params.id,
    ...patch,
  })
  res.json({ menu })
}
