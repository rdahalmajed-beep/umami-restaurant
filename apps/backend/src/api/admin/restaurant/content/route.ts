import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"
import { BrandContentSchema } from "../../../../modules/restaurant/content-schema"
import { revalidateStorefrontTags } from "../../../../modules/restaurant/cache-invalidation"
import { z } from "zod"

const BodySchema = z.object({
  key: z.string().default("brand"),
  locale: z.string().default("ar"),
  content: BrandContentSchema,
})

/**
 * GET/POST /admin/restaurant/content
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const key =
    typeof req.query.key === "string" ? req.query.key : "brand"
  const locale =
    typeof req.query.locale === "string" ? req.query.locale : "ar"
  const row = await restaurant.getOrCreateContent(key, locale)
  res.json({ content: row })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const body = BodySchema.parse(req.body)
  const current = await restaurant.getOrCreateContent(body.key, body.locale)
  const actor =
    (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id ||
    null

  const updated = await restaurant.updateRestaurantContents({
    id: current.id,
    content_json: body.content,
    updated_by: actor,
  })

  await restaurant.writeAuditLog({
    actor_id: actor,
    action: "content.update",
    resource_type: "restaurant_content",
    resource_id: current.id,
    before: current.content_json,
    after: body.content,
  })

  await revalidateStorefrontTags(["restaurant-content", "restaurant-menu"])

  res.json({ content: updated })
}
