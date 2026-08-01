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
import { useTranslation } from "react-i18next"

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
  version?: number
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

function getPrimaryNext(
  status: string,
  orderType?: string | null
): { status: string; labelKey: string } | null {
  switch (status) {
    case "received":
      return { status: "accepted", labelKey: "restaurant.kitchen.accept" }
    case "accepted":
      return {
        status: "preparing",
        labelKey: "restaurant.kitchen.startPreparing",
      }
    case "preparing":
      return { status: "ready", labelKey: "restaurant.kitchen.markReady" }
    case "ready":
      if (orderType === "delivery") {
        return {
          status: "out_for_delivery",
          labelKey: "restaurant.kitchen.outForDelivery",
        }
      }
      return {
        status: "completed",
        labelKey: "restaurant.kitchen.markDelivered",
      }
    case "out_for_delivery":
      return {
        status: "completed",
        labelKey: "restaurant.kitchen.markCompleted",
      }
    default:
      return null
  }
}

const OrderKitchenStatusWidget = ({
  data: order,
}: DetailWidgetProps<AdminOrder>) => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [nextStatus, setNextStatus] = useState<string>("")

  const statusLabel = (status: string) =>
    t(`restaurant.kitchen.status.${status}`, { defaultValue: status })

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-order-status", order.id],
    queryFn: async () => {
      const res = await fetch(
        `/admin/restaurant/orders/${order.id}/status`,
        { credentials: "include" }
      )
      if (!res.ok) throw new Error(t("restaurant.kitchen.loadError"))
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

  const primary = row
    ? getPrimaryNext(row.status, row.order_type)
    : null

  const transition = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(
        `/admin/restaurant/orders/${order.id}/status`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            expected_version: row?.version,
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || t("restaurant.kitchen.transitionError"))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.kitchen.updated"))
      setNextStatus("")
      qc.invalidateQueries({
        queryKey: ["restaurant-order-status", order.id],
      })
      qc.invalidateQueries({ queryKey: ["restaurant-kitchen-orders"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Container className="p-4 flex flex-col gap-y-3">
      <Heading level="h2">{t("restaurant.kitchen.title")}</Heading>
      {isLoading || !row ? (
        <Text>{t("restaurant.kitchen.loading")}</Text>
      ) : (
        <>
          <div className="flex items-center gap-x-2">
            <Badge size="2xsmall">{statusLabel(row.status)}</Badge>
            {row.order_type && (
              <Badge size="2xsmall" color="blue">
                {row.order_type}
              </Badge>
            )}
          </div>
          {row.last_transition_at && (
            <Text className="text-ui-fg-subtle text-sm">
              {t("restaurant.kitchen.lastChange")}{" "}
              {new Date(row.last_transition_at).toLocaleString()}{" "}
              {t("restaurant.kitchen.by")}{" "}
              {row.last_transition_by || "—"}
            </Text>
          )}

          {primary && (
            <Button
              size="large"
              className="w-full min-h-11"
              isLoading={transition.isPending}
              disabled={transition.isPending}
              onClick={() => transition.mutate(primary.status)}
            >
              {t(primary.labelKey)}
            </Button>
          )}

          <div className="flex gap-x-2 items-end">
            <div className="flex-1">
              <Select value={nextStatus} onValueChange={setNextStatus}>
                <Select.Trigger>
                  <Select.Value
                    placeholder={t("restaurant.kitchen.transitionTo")}
                  />
                </Select.Trigger>
                <Select.Content>
                  {ALL_STATUSES.filter((s) => s !== row.status).map((s) => (
                    <Select.Item key={s} value={s}>
                      {statusLabel(s)}
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
              {t("restaurant.kitchen.update")}
            </Button>
          </div>

          <Heading level="h3">{t("restaurant.kitchen.history")}</Heading>
          <div className="flex flex-col gap-y-1">
            {events.map((e) => (
              <Text key={e.id} className="text-sm text-ui-fg-subtle">
                {new Date(e.created_at).toLocaleString()}:{" "}
                {e.from_status ? statusLabel(e.from_status) : "∅"} →{" "}
                <strong>{statusLabel(e.to_status)}</strong>
                {e.changed_by ? ` (${e.changed_by})` : ""}
                {e.note ? ` — ${e.note}` : ""}
              </Text>
            ))}
            {!events.length && (
              <Text className="text-sm">{t("restaurant.kitchen.noEvents")}</Text>
            )}
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
