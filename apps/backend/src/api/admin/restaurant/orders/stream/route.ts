import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  kitchenEvents,
  type KitchenRealtimeEvent,
} from "../../../../../modules/restaurant/kitchen-events"

/**
 * GET /admin/restaurant/orders/stream
 * Authenticated SSE for KDS realtime (falls back to client polling if unavailable).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache, no-transform")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")
  res.flushHeaders?.()

  const write = (event: KitchenRealtimeEvent) => {
    res.write(`id: ${event.id}\n`)
    res.write(`event: ${event.type}\n`)
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }

  write({
    id: `hello-${Date.now()}`,
    type: "heartbeat",
    at: new Date().toISOString(),
  })

  const onKitchen = (event: KitchenRealtimeEvent) => write(event)
  kitchenEvents.on("kitchen", onKitchen)

  const heartbeat = setInterval(() => {
    write({
      id: `hb-${Date.now()}`,
      type: "heartbeat",
      at: new Date().toISOString(),
    })
  }, 15000)

  req.on("close", () => {
    clearInterval(heartbeat)
    kitchenEvents.off("kitchen", onKitchen)
    res.end()
  })
}
