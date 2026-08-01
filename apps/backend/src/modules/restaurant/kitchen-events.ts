import { EventEmitter } from "events"

export type KitchenRealtimeEvent = {
  id: string
  type:
    | "order.received"
    | "order.updated"
    | "order.status_changed"
    | "branch.paused"
    | "branch.resumed"
    | "availability.changed"
    | "settings.updated"
    | "heartbeat"
  at: string
  order_id?: string
  restaurant_order_id?: string
  status?: string
  version?: number
  branch_id?: string
}

/**
 * In-process fan-out for KDS SSE (local/dev).
 * Production should prefer Redis-backed Medusa event bus + multi-instance pub/sub.
 */
class KitchenEventBus extends EventEmitter {
  emitKitchen(event: Omit<KitchenRealtimeEvent, "id" | "at"> & { id?: string }) {
    const full: KitchenRealtimeEvent = {
      id: event.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      ...event,
    }
    this.emit("kitchen", full)
    return full
  }
}

export const kitchenEvents = new KitchenEventBus()
kitchenEvents.setMaxListeners(100)
