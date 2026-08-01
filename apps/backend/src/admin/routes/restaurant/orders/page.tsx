import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Text,
  clx,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

type KitchenOrder = {
  id: string
  order_id: string
  status: string
  version?: number
  order_type?: string | null
  branch_id?: string | null
  branch_name?: string | null
  last_transition_at?: string | null
  created_at?: string | null
  promised_at?: string | null
  overdue?: boolean
  display_id?: number | null
  currency_code: string
  total?: number | null
  item_count?: number
  ticket_summary?: string
  customer_first_name?: string | null
  customer_phone?: string | null
  customer_note?: string | null
  estimated_preparation_minutes?: number | null
}

type Ticket = {
  items: {
    id: string
    title: string
    quantity: number
    note?: string | null
    modifiers: { group_name: string; option_name: string }[]
  }[]
  address?: string | null
  customer_name?: string | null
}

type TabKey = "all" | "received" | "accepted" | "preparing" | "ready"

const formatMoney = (amount: number | null | undefined, currency: string) => {
  if (amount == null) return "—"
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(amount)
  } catch {
    return `${amount.toFixed(3)} ${currency.toUpperCase()}`
  }
}

const elapsedLabel = (iso?: string | null) => {
  if (!iso) return ""
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

const primaryAction = (
  order: KitchenOrder
): { status: string; labelKey: string } | null => {
  switch (order.status) {
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
      if (order.order_type === "delivery") {
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

function playNewOrderChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = "sine"
    o.frequency.value = 880
    g.gain.value = 0.05
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 0.18)
  } catch {
    /* ignore */
  }
}

const KitchenOrdersPage = () => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabKey>("all")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [connection, setConnection] = useState<"live" | "poll" | "offline">(
    "poll"
  )
  const [lastSync, setLastSync] = useState<string | null>(null)
  const knownIds = useRef<Set<string>>(new Set())
  const primed = useRef(false)

  const statusQuery = tab === "all" ? "" : `&status=${tab}`

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["restaurant-kitchen-orders", tab],
    queryFn: async () => {
      const res = await fetch(
        `/admin/restaurant/orders?view=summary&limit=40${statusQuery}`,
        { credentials: "include" }
      )
      if (!res.ok) throw new Error(t("restaurant.inbox.loadError"))
      setLastSync(new Date().toISOString())
      return (await res.json()) as { orders: KitchenOrder[] }
    },
    refetchInterval: connection === "live" ? false : 8000,
  })

  useEffect(() => {
    const es = new EventSource("/admin/restaurant/orders/stream", {
      withCredentials: true,
    })
    let opened = false
    es.onopen = () => {
      opened = true
      setConnection("live")
    }
    es.onerror = () => {
      es.close()
      if (!opened) setConnection("poll")
      else setConnection("poll")
    }
    const refresh = () => {
      setLastSync(new Date().toISOString())
      qc.invalidateQueries({ queryKey: ["restaurant-kitchen-orders"] })
      qc.invalidateQueries({ queryKey: ["restaurant-dashboard"] })
    }
    es.addEventListener("order.received", () => {
      playNewOrderChime()
      refresh()
    })
    es.addEventListener("order.status_changed", refresh)
    es.addEventListener("heartbeat", () => setConnection("live"))
    return () => es.close()
  }, [qc])

  useEffect(() => {
    const orders = data?.orders || []
    if (!primed.current) {
      knownIds.current = new Set(orders.map((o) => o.id))
      primed.current = true
      return
    }
    for (const o of orders) {
      if (!knownIds.current.has(o.id) && o.status === "received") {
        playNewOrderChime()
      }
    }
    knownIds.current = new Set(orders.map((o) => o.id))
  }, [data?.orders])

  const transition = useMutation({
    mutationFn: async ({
      orderId,
      status,
      expected_version,
      note,
    }: {
      orderId: string
      status: string
      expected_version?: number
      note?: string
    }) => {
      const res = await fetch(`/admin/restaurant/orders/${orderId}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, expected_version, note }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || t("restaurant.kitchen.transitionError"))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.inbox.updated"))
      setCancelId(null)
      setCancelReason("")
      qc.invalidateQueries({ queryKey: ["restaurant-kitchen-orders"] })
      qc.invalidateQueries({ queryKey: ["restaurant-dashboard"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const loadTicket = async (orderId: string) => {
    if (expanded === orderId) {
      setExpanded(null)
      setTicket(null)
      return
    }
    setExpanded(orderId)
    const res = await fetch(`/admin/restaurant/orders/${orderId}/ticket`, {
      credentials: "include",
    })
    if (!res.ok) {
      toast.error(t("restaurant.inbox.ticketError"))
      return
    }
    const json = (await res.json()) as { ticket: Ticket }
    setTicket(json.ticket)
  }

  const orders = data?.orders || []
  const counts = useMemo(() => {
    const base = { received: 0, accepted: 0, preparing: 0, ready: 0 }
    if (tab !== "all") return base
    for (const o of orders) {
      if (o.status in base) base[o.status as keyof typeof base]++
      if (o.status === "out_for_delivery") base.ready++
    }
    return base
  }, [orders, tab])

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "all", label: t("restaurant.inbox.tabAll") },
    {
      key: "received",
      label: t("restaurant.inbox.tabReceived"),
      count: counts.received,
    },
    {
      key: "accepted",
      label: t("restaurant.inbox.tabAccepted"),
      count: counts.accepted,
    },
    {
      key: "preparing",
      label: t("restaurant.inbox.tabPreparing"),
      count: counts.preparing,
    },
    {
      key: "ready",
      label: t("restaurant.inbox.tabReady"),
      count: counts.ready,
    },
  ]

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-col gap-3 small:flex-row small:items-center small:justify-between">
        <div>
          <Heading level="h1">{t("restaurant.inbox.title")}</Heading>
          <Text className="text-ui-fg-subtle text-sm">
            {t("restaurant.inbox.subtitle")}
            {isFetching && !isLoading ? " · …" : ""}
            {" · "}
            {connection === "live"
              ? t("restaurant.inbox.live")
              : t("restaurant.inbox.polling")}
            {lastSync
              ? ` · ${t("restaurant.inbox.synced")} ${new Date(lastSync).toLocaleTimeString()}`
              : ""}
          </Text>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="secondary" size="small">
            <Link to="/restaurant">{t("restaurant.hub.back")}</Link>
          </Button>
          <Button asChild variant="secondary" size="small">
            <Link to="/restaurant/orders/history">
              {t("restaurant.hub.history")}
            </Link>
          </Button>
          <Button size="small" variant="secondary" onClick={() => refetch()}>
            {t("restaurant.inbox.refresh")}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={clx(
              "shrink-0 rounded-full px-3 py-2 text-sm font-medium border transition-colors min-h-10",
              tab === item.key
                ? "bg-ui-bg-interactive text-ui-fg-on-color border-ui-bg-interactive"
                : "bg-ui-bg-base text-ui-fg-base border-ui-border-base hover:bg-ui-bg-base-hover"
            )}
          >
            {item.label}
            {tab === "all" && item.count != null && item.key !== "all"
              ? ` (${item.count})`
              : ""}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Text>{t("restaurant.inbox.loading")}</Text>
      ) : !orders.length ? (
        <Container className="p-8 text-center flex flex-col gap-2">
          <Heading level="h2">{t("restaurant.inbox.empty")}</Heading>
          <Text className="text-ui-fg-subtle">
            {t("restaurant.inbox.emptyHint")}
          </Text>
        </Container>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const action = primaryAction(order)
            const busy =
              transition.isPending &&
              transition.variables?.orderId === order.order_id

            return (
              <Container
                key={order.id}
                className={clx(
                  "p-4 flex flex-col gap-3 shadow-elevation-card-rest",
                  order.overdue && "border border-orange-400",
                  order.status === "received" && "ring-1 ring-ui-border-interactive"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Heading level="h2" className="text-lg">
                        #{order.display_id ?? "—"}
                      </Heading>
                      <Badge size="2xsmall" color="blue">
                        {order.order_type === "delivery"
                          ? t("restaurant.inbox.delivery")
                          : t("restaurant.inbox.pickup")}
                      </Badge>
                      <Badge
                        size="2xsmall"
                        color={order.overdue ? "orange" : "grey"}
                      >
                        {t(`restaurant.kitchen.status.${order.status}`, {
                          defaultValue: order.status,
                        })}
                      </Badge>
                      {order.overdue && (
                        <Badge size="2xsmall" color="orange">
                          {t("restaurant.inbox.overdue")}
                        </Badge>
                      )}
                    </div>
                    <Text className="text-ui-fg-subtle text-sm">
                      {order.branch_name || "—"} · {elapsedLabel(order.created_at)} ·{" "}
                      {order.item_count ?? 0} {t("restaurant.inbox.items")}
                    </Text>
                    {(order.customer_first_name || order.customer_phone) && (
                      <Text className="text-sm">
                        {[order.customer_first_name, order.customer_phone]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    )}
                    {order.ticket_summary && (
                      <Text className="text-sm text-ui-fg-subtle">
                        {order.ticket_summary}
                      </Text>
                    )}
                  </div>
                  <Text className="font-semibold shrink-0">
                    {formatMoney(order.total, order.currency_code)}
                  </Text>
                </div>

                {order.customer_note && (
                  <Text className="text-sm bg-ui-bg-subtle rounded-md px-3 py-2 italic">
                    {order.customer_note}
                  </Text>
                )}

                {expanded === order.order_id && ticket && (
                  <ul className="flex flex-col gap-2 border-t border-ui-border-base pt-3">
                    {ticket.items.map((item) => (
                      <li key={item.id} className="text-sm">
                        <span className="font-medium">
                          {item.quantity}× {item.title}
                        </span>
                        {!!item.modifiers.length && (
                          <span className="text-ui-fg-subtle block">
                            {item.modifiers
                              .map((m) => m.option_name)
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        )}
                        {item.note && (
                          <span className="text-ui-fg-subtle block italic">
                            {item.note}
                          </span>
                        )}
                      </li>
                    ))}
                    {ticket.address && (
                      <Text className="text-ui-fg-subtle text-sm">
                        {ticket.address}
                      </Text>
                    )}
                  </ul>
                )}

                {cancelId === order.order_id && (
                  <div className="flex flex-col gap-2 border-t border-ui-border-base pt-3">
                    <Input
                      placeholder={t("restaurant.inbox.cancelReason")}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="small"
                        variant="danger"
                        disabled={!cancelReason.trim() || transition.isPending}
                        onClick={() =>
                          transition.mutate({
                            orderId: order.order_id,
                            status: "cancelled",
                            expected_version: order.version,
                            note: cancelReason.trim(),
                          })
                        }
                      >
                        {t("restaurant.kitchen.cancel")}
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => {
                          setCancelId(null)
                          setCancelReason("")
                        }}
                      >
                        {t("restaurant.inbox.cancelDismiss")}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 small:flex-row small:items-stretch pt-1">
                  {action && (
                    <Button
                      size="large"
                      className="w-full small:flex-1 min-h-11"
                      isLoading={busy}
                      disabled={transition.isPending}
                      onClick={() =>
                        transition.mutate({
                          orderId: order.order_id,
                          status: action.status,
                          expected_version: order.version,
                        })
                      }
                    >
                      {t(action.labelKey)}
                    </Button>
                  )}
                  <Button
                    size="large"
                    variant="secondary"
                    className="w-full small:w-auto min-h-11"
                    onClick={() => loadTicket(order.order_id)}
                  >
                    {expanded === order.order_id
                      ? t("restaurant.inbox.hideTicket")
                      : t("restaurant.inbox.showTicket")}
                  </Button>
                  {order.status !== "received" && (
                    <Button
                      asChild
                      size="large"
                      variant="secondary"
                      className="w-full small:w-auto min-h-11"
                    >
                      <Link to={`/orders/${order.order_id}`}>
                        {t("restaurant.kitchen.details")}
                      </Link>
                    </Button>
                  )}
                  {order.status === "received" && (
                    <Button
                      size="large"
                      variant="danger"
                      className="w-full small:w-auto min-h-11"
                      disabled={transition.isPending}
                      onClick={() => setCancelId(order.order_id)}
                    >
                      {t("restaurant.kitchen.cancel")}
                    </Button>
                  )}
                </div>
              </Container>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default KitchenOrdersPage
