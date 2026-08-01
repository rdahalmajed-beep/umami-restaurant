import {
  defineMiddlewares,
  type MiddlewareRoute,
} from "@medusajs/framework/http"
import {
  attachRestaurantRole,
  requireRestaurantPermission,
} from "./middlewares/restaurant-auth"

const restaurantAdminGuards: MiddlewareRoute[] = [
  {
    matcher: "/admin/restaurant*",
    middlewares: [attachRestaurantRole],
  },
  {
    matcher: "/admin/restaurant/settings*",
    methods: ["POST"],
    middlewares: [requireRestaurantPermission("restaurant.settings.write")],
  },
  {
    matcher: "/admin/restaurant/menus*",
    methods: ["POST"],
    middlewares: [requireRestaurantPermission("restaurant.menu.write")],
  },
  {
    matcher: "/admin/restaurant/availability*",
    methods: ["POST"],
    middlewares: [requireRestaurantPermission("restaurant.availability.write")],
  },
  {
    matcher: "/admin/restaurant/content*",
    methods: ["POST"],
    middlewares: [requireRestaurantPermission("restaurant.content.write")],
  },
  {
    matcher: "/admin/restaurant/audit-logs*",
    methods: ["GET"],
    middlewares: [requireRestaurantPermission("restaurant.audit.read")],
  },
  {
    matcher: "/admin/restaurant/outbox*",
    methods: ["POST"],
    middlewares: [requireRestaurantPermission("restaurant.integration.write")],
  },
  {
    matcher: "/admin/restaurant/fulfillment-policies*",
    methods: ["POST"],
    middlewares: [requireRestaurantPermission("restaurant.branch.write")],
  },
]

export default defineMiddlewares({
  routes: restaurantAdminGuards,
})
