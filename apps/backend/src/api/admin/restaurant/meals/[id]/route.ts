import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { RESTAURANT_MODULE } from "../../../../../modules/restaurant"
import RestaurantModuleService from "../../../../../modules/restaurant/service"

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().nullable().optional(),
  title_i18n_json: z.record(z.string(), z.string()).nullable().optional(),
  subtitle_i18n_json: z.record(z.string(), z.string()).nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  meal_type: z
    .enum(["fixed", "choose", "mix_match", "family", "upgrade", "seasonal"])
    .optional(),
  pricing_mode: z
    .enum(["fixed", "from", "components_discount", "dynamic"])
    .optional(),
  base_price: z.number().nonnegative().optional(),
  discount_amount: z.number().nullable().optional(),
  unavailable_policy: z
    .enum(["hide_choice", "show_substitute", "pause_meal"])
    .optional(),
  branch_ids_json: z.array(z.string()).nullable().optional(),
  applies_delivery: z.boolean().optional(),
  applies_pickup: z.boolean().optional(),
  action: z.enum(["add_step", "publish"]).optional(),
  step_title: z.string().optional(),
  min_selections: z.number().int().optional(),
  max_selections: z.number().int().optional(),
})

const StepItemSchema = z.object({
  action: z.literal("add_step_item"),
  step_id: z.string(),
  product_id: z.string(),
  variant_id: z.string().nullable().optional(),
  upgrade_price: z.number().nonnegative().optional(),
  is_default: z.boolean().optional(),
  substitute_product_id: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const meal = await restaurant.retrieveMeal(req.params.id, {
    relations: ["steps", "steps.items"],
  })
  res.json({ meal })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const restaurant: RestaurantModuleService =
    req.scope.resolve(RESTAURANT_MODULE)
  const raw = req.body as Record<string, unknown>

  if (raw.action === "add_step_item") {
    const body = StepItemSchema.parse(raw)
    const [item] = await restaurant.createMealStepItems([
      {
        step_id: body.step_id,
        product_id: body.product_id,
        variant_id: body.variant_id ?? null,
        upgrade_price: body.upgrade_price ?? 0,
        is_default: !!body.is_default,
        substitute_product_id: body.substitute_product_id ?? null,
        label: body.label ?? null,
      },
    ])
    res.status(201).json({ item })
    return
  }

  const body = UpdateSchema.parse(raw)

  if (body.action === "add_step") {
    const [step] = await restaurant.createMealSteps([
      {
        meal_id: req.params.id,
        title: body.step_title || "Step",
        min_selections: body.min_selections ?? 1,
        max_selections: body.max_selections ?? 1,
      },
    ])
    res.status(201).json({ step })
    return
  }

  if (body.action === "publish") {
    const meal = await restaurant.updateMeals({
      id: req.params.id,
      status: "published",
    })
    await restaurant.writeAuditLog({
      action: "meal.publish",
      resource_type: "meal",
      resource_id: req.params.id,
    })
    res.json({ meal })
    return
  }

  const { action: _a, step_title: _s, ...patch } = body
  const meal = await restaurant.updateMeals({ id: req.params.id, ...patch })
  res.json({ meal })
}
