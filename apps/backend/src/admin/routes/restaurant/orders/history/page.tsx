import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Text,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

type HistoryOrder = {
  id: string
  order_id: string
  status: string
  display_id?: number | null
  total?: number | null
  currency_code: string
  order_type?: string | null
  last_transition_at?: string | null
  created_at?: string | null
}

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
    return `${amount.toFixed(3)} ${currency}`
  }
}

const KitchenHistoryPage = () => {
  const { t } = useTranslation()
  const [q, setQ] = useState("")
  const [offset, setOffset] = useState(0)
  const limit = 30

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-kitchen-history", q, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      })
      if (q.trim()) params.set("q", q.trim())
      const res = await fetch(
        `/admin/restaurant/orders/history?${params.toString()}`,
        { credentials: "include" }
      )
      if (!res.ok) throw new Error(t("restaurant.history.loadError"))
      return (await res.json()) as { orders: HistoryOrder[] }
    },
  })

  const orders = data?.orders || []

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">{t("restaurant.history.title")}</Heading>
          <Text className="text-ui-fg-subtle text-sm">
            {t("restaurant.history.subtitle")}
          </Text>
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant/orders">{t("restaurant.hub.kitchen")}</Link>
        </Button>
      </div>

      <Input
        placeholder={t("restaurant.history.search")}
        value={q}
        onChange={(e) => {
          setOffset(0)
          setQ(e.target.value)
        }}
      />

      {isLoading ? (
        <Text>{t("restaurant.history.loading")}</Text>
      ) : !orders.length ? (
        <Container className="p-6">
          <Text>{t("restaurant.history.empty")}</Text>
        </Container>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((o) => (
            <Container
              key={o.id}
              className="p-3 flex items-center justify-between gap-3"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Text className="font-medium">#{o.display_id ?? "—"}</Text>
                  <Badge size="2xsmall">
                    {t(`restaurant.kitchen.status.${o.status}`, {
                      defaultValue: o.status,
                    })}
                  </Badge>
                  {o.order_type && (
                    <Badge size="2xsmall" color="blue">
                      {o.order_type}
                    </Badge>
                  )}
                </div>
                <Text className="text-ui-fg-subtle text-sm">
                  {o.last_transition_at
                    ? new Date(o.last_transition_at).toLocaleString()
                    : "—"}
                </Text>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Text className="font-semibold">
                  {formatMoney(o.total, o.currency_code)}
                </Text>
                <Button asChild size="small" variant="secondary">
                  <Link to={`/orders/${o.order_id}`}>
                    {t("restaurant.kitchen.details")}
                  </Link>
                </Button>
              </div>
            </Container>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="small"
          variant="secondary"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - limit))}
        >
          {t("restaurant.history.prev")}
        </Button>
        <Button
          size="small"
          variant="secondary"
          disabled={orders.length < limit}
          onClick={() => setOffset(offset + limit)}
        >
          {t("restaurant.history.next")}
        </Button>
      </div>
    </div>
  )
}

export default KitchenHistoryPage
