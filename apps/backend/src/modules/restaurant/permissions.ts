/**
 * Restaurant custom Admin permissions (AUTH-001).
 * Enforced in API middlewares; UI hiding alone is not enough.
 */
export const RESTAURANT_PERMISSIONS = [
  "restaurant.settings.read",
  "restaurant.settings.write",
  "restaurant.branch.read",
  "restaurant.branch.write",
  "restaurant.branch.pause",
  "restaurant.menu.read",
  "restaurant.menu.write",
  "restaurant.menu.publish",
  "restaurant.availability.write",
  "restaurant.order.read",
  "restaurant.order.accept",
  "restaurant.order.advance",
  "restaurant.order.cancel",
  "restaurant.payment.refund",
  "restaurant.report.read",
  "restaurant.integration.write",
  "restaurant.audit.read",
  "restaurant.content.write",
] as const

export type RestaurantPermission = (typeof RESTAURANT_PERMISSIONS)[number]

export const RESTAURANT_ROLES = {
  owner: [...RESTAURANT_PERMISSIONS],
  manager: [
    "restaurant.settings.read",
    "restaurant.branch.read",
    "restaurant.branch.write",
    "restaurant.branch.pause",
    "restaurant.menu.read",
    "restaurant.menu.write",
    "restaurant.menu.publish",
    "restaurant.availability.write",
    "restaurant.order.read",
    "restaurant.order.accept",
    "restaurant.order.advance",
    "restaurant.order.cancel",
    "restaurant.report.read",
    "restaurant.audit.read",
    "restaurant.content.write",
  ],
  kitchen: [
    "restaurant.order.read",
    "restaurant.order.accept",
    "restaurant.order.advance",
    "restaurant.order.cancel",
    "restaurant.availability.write",
    "restaurant.branch.read",
  ],
  cashier: [
    "restaurant.order.read",
    "restaurant.order.accept",
    "restaurant.order.advance",
    "restaurant.payment.refund",
    "restaurant.branch.read",
  ],
  content_editor: [
    "restaurant.content.write",
    "restaurant.menu.read",
    "restaurant.menu.write",
    "restaurant.menu.publish",
    "restaurant.settings.read",
  ],
} as const satisfies Record<string, readonly RestaurantPermission[]>

export type RestaurantRole = keyof typeof RESTAURANT_ROLES

/** Until Medusa user-metadata roles are wired, treat authenticated admin as owner. */
export function resolveRestaurantRole(
  _actorId?: string | null,
  metadataRole?: string | null
): RestaurantRole {
  if (metadataRole && metadataRole in RESTAURANT_ROLES) {
    return metadataRole as RestaurantRole
  }
  return "owner"
}

export function roleHasPermission(
  role: RestaurantRole,
  permission: RestaurantPermission
): boolean {
  return (RESTAURANT_ROLES[role] as readonly string[]).includes(permission)
}
