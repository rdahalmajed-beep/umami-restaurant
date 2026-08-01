"use client"

import { useEffect, useState } from "react"
import { Text } from "@modules/common/components/ui"

type Props = {
  orderId: string
  accessToken: string | null
  initialStatus: string
  orderType: string | null
  prepMinutes: number
  branchName?: string | null
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

/**
 * Polls kitchen status for guests on the confirmation page.
 */
export default function KitchenStatusTracker({
  orderId,
  accessToken,
  initialStatus,
  orderType,
  prepMinutes,
  branchName,
}: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [syncedAt, setSyncedAt] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const headers: Record<string, string> = {}
        if (accessToken) {
          headers["x-restaurant-order-token"] = accessToken
        }
        const base =
          process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
        const pub = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
        if (pub) headers["x-publishable-api-key"] = pub

        const res = await fetch(
          `${base}/store/restaurant/orders/${orderId}/status`,
          { headers, cache: "no-store" }
        )
        if (!res.ok) return
        const data = await res.json()
        const next = data?.restaurant_order?.status
        if (!cancelled && next) {
          setStatus(next)
          setSyncedAt(new Date())
        }
      } catch {
        // keep last known status
      }
    }

    tick()
    const id = setInterval(tick, 8000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [orderId, accessToken])

  return (
    <div
      className="grid grid-cols-2 small:grid-cols-4 gap-3"
      data-testid="restaurant-order-meta"
    >
      <div className="bg-umami-mist/60 p-3">
        <Text className="text-xs text-umami-ink/50">Kitchen</Text>
        <Text
          className="font-semibold text-umami-leaf capitalize"
          data-testid="kitchen-status"
        >
          {formatStatus(status)}
        </Text>
        {syncedAt ? (
          <Text className="text-[10px] text-umami-ink/40 mt-1">
            Live · {syncedAt.toLocaleTimeString()}
          </Text>
        ) : null}
      </div>
      <div className="bg-umami-mist/60 p-3">
        <Text className="text-xs text-umami-ink/50">Est. prep</Text>
        <Text
          className="font-semibold text-umami-ink"
          data-testid="prep-time"
        >
          ~{prepMinutes} min
        </Text>
      </div>
      <div className="bg-umami-mist/60 p-3">
        <Text className="text-xs text-umami-ink/50">Order type</Text>
        <Text
          className="font-semibold text-umami-ink capitalize"
          data-testid="order-type"
        >
          {orderType || "—"}
        </Text>
      </div>
      <div className="bg-umami-mist/60 p-3">
        <Text className="text-xs text-umami-ink/50">Branch</Text>
        <Text className="font-semibold text-umami-ink" data-testid="order-branch-live">
          {branchName || "—"}
        </Text>
      </div>
    </div>
  )
}
