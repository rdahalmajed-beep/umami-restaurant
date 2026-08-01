import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  resolveRestaurantRole,
  roleHasPermission,
  type RestaurantPermission,
  type RestaurantRole,
} from "../../modules/restaurant/permissions"

/**
 * Attach restaurant role from user metadata.restaurant_role (AUTH-001).
 * Defaults to owner when unset so existing single-admin setups keep working.
 */
export async function attachRestaurantRole(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const actorId =
    (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id ||
    null

  let metadataRole: string | null = null
  if (actorId) {
    try {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "user",
        fields: ["id", "metadata"],
        filters: { id: actorId },
      })
      const user = data?.[0] as
        | { metadata?: { restaurant_role?: string } | null }
        | undefined
      metadataRole = user?.metadata?.restaurant_role || null
    } catch {
      metadataRole = null
    }
  }

  const role = resolveRestaurantRole(actorId, metadataRole)
  ;(req as { restaurant_role?: RestaurantRole }).restaurant_role = role
  next()
}

export function requireRestaurantPermission(permission: RestaurantPermission) {
  return async (
    req: MedusaRequest,
    _res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    const role =
      ((req as { restaurant_role?: RestaurantRole }).restaurant_role as
        | RestaurantRole
        | undefined) || "owner"
    if (!roleHasPermission(role, permission)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `RESTAURANT_FORBIDDEN: missing ${permission}`
      )
    }
    next()
  }
}
