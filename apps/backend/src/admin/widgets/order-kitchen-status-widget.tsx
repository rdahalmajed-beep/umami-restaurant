import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import {
  Badge,
  Button,
  Container,
  Heading,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"

type StatusEvent = {
  id: string
  from_status: string | null
  to_status: string
  changed_by: string | null
  note: string | null
  created_at: string
}

type RestaurantOrder = {
  id: string
  order_id: string
  status: string
  order_type?: string | null
  last_transition_at?: string | null
  last_transition_by?: string | null
  events?: StatusEvent[]
}

const ALL_STATUSES = [
  "received",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const

const OrderKitchenStatusWidget = ({
  data: order,
}: DetailWidgetProps<AdminOrder>) => {
  const qc = useQueryClient()
  const [nextStatus, setNextStatus] = useState<string>("")

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-order-status", order.id],
    queryFn: async () => {
      const res = await fetch(
        `/admin/restaurant/orders/${order.id}/status`,
        { credentials: "include" }
      )
      if (!res.ok) throw new Error("Failed to load kitchen status")
      return (await res.json()) as { restaurant_order: RestaurantOrder }
    },
  })

  const row = data?.restaurant_order
  const events = useMemo(() => {
    const list = [...(row?.events || [])]
    return list.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [row?.events])

  const transition = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(
        `/admin/restaurant/orders/${order.id}/status`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || "Transition failed")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Kitchen status updated")
      setNextStatus("")
      qc.invalidateQueries({
        queryKey: ["restaurant-order-status", order.id],
      })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Container className="p-4 flex flex-col gap-y-3">
      <Heading level="h2">Kitchen status</Heading>
      {isLoading || !row ? (
        <Text>Loading…</Text>
      ) : (
        <>
          <div className="flex items-center gap-x-2">
            <Badge size="2xsmall">{row.status}</Badge>
            {row.order_type && (
              <Badge size="2xsmall" color="blue">
                {row.order_type}
              </Badge>
            )}
          </div>
          {row.last_transition_at && (
            <Text className="text-ui-fg-subtle text-sm">
              Last change:{" "}
              {new Date(row.last_transition_at).toLocaleString()} by{" "}
              {row.last_transition_by || "—"}
            </Text>
          )}

          <div className="flex gap-x-2 items-end">
            <div className="flex-1">
              <Select value={nextStatus} onValueChange={setNextStatus}>
                <Select.Trigger>
                  <Select.Value placeholder="Transition to…" />
                </Select.Trigger>
                <Select.Content>
                  {ALL_STATUSES.filter((s) => s !== row.status).map((s) => (
                    <Select.Item key={s} value={s}>
                      {s}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <Button
              size="small"
              disabled={!nextStatus || transition.isPending}
              isLoading={transition.isPending}
              onClick={() => transition.mutate(nextStatus)}
            >
              Update
            </Button>
          </div>

          <Heading level="h3">History</Heading>
          <div className="flex flex-col gap-y-1">
            {events.map((e) => (
              <Text key={e.id} className="text-sm text-ui-fg-subtle">
                {new Date(e.created_at).toLocaleString()}:{" "}
                {e.from_status || "∅"} → <strong>{e.to_status}</strong>
                {e.changed_by ? ` (${e.changed_by})` : ""}
                {e.note ? ` — ${e.note}` : ""}
              </Text>
            ))}
            {!events.length && <Text className="text-sm">No events yet</Text>}
          </div>
        </>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default OrderKitchenStatusWidget
