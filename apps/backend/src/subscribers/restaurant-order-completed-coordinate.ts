import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { coordinateKitchenCompletedWorkflow } from "../workflows/coordinate-kitchen-completed"

/**
 * When kitchen reaches completed, run explicit commerce coordination workflow.
 */
export default async function restaurantOrderCompletedCoordinate({
  event: { data },
  container,
}: SubscriberArgs<{
  order_id: string
  status: string
}>) {
  if (data.status !== "completed") return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    await coordinateKitchenCompletedWorkflow(container).run({
      input: { order_id: data.order_id },
    })
  } catch (err) {
    logger.warn(
      `coordinateKitchenCompletedWorkflow: ${
        err instanceof Error ? err.message : err
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: "restaurant.order_status.updated",
}
