import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RESTAURANT_MODULE } from "../../../../modules/restaurant"
import RestaurantModuleService from "../../../../modules/restaurant/service"
import { BrandContentSchema } from "../../../../modules/restaurant/content-schema"

/**
 * GET /store/restaurant/content?key=brand&locale=ar
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const key =
    typeof req.query.key === "string" ? req.query.key : "brand"
  const locale =
    typeof req.query.locale === "string" ? req.query.locale : "ar"

  const rows = await restaurant.listRestaurantContents({ key, locale })
  if (!rows.length) {
    res.json({
      content: {
        key,
        locale,
        content_json: {},
        schema_version: 1,
      },
    })
    return
  }

  const parsed = BrandContentSchema.safeParse(rows[0].content_json || {})
  res.json({
    content: {
      id: rows[0].id,
      key: rows[0].key,
      locale: rows[0].locale,
      content_json: parsed.success ? parsed.data : {},
      schema_version: rows[0].schema_version,
    },
  })
}
