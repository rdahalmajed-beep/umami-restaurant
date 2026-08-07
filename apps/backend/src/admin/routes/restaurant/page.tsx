import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Buildings } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Text,
  toast,
  clx,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { ReactNode } from "react"
import { formatRestaurantMoney } from "../../lib/format-money"

type Dashboard = {
  counts: {
    received: number
    accepted: number
    preparing: number
    ready: number
    out_for_delivery: number
    active_total: number
    overdue: number
  }
  settings: {
    ordering_enabled: boolean
    default_prep_minutes: number
  }
  branches: {
    id: string
    name: string
    operational_state: string
    is_paused: boolean
    preparation_minutes: number
  }[]
  unavailable_count: number
  today: {
    orders: number
    revenue: number
    aov: number
    currency_code: string
  }
}

const CardLink = ({
  to,
  title,
  description,
  badge,
}: {
  to: string
  title: string
  description: string
  badge?: string | number | null
}) => (
  <Link
    to={to}
    className={clx(
      "block rounded-lg border border-ui-border-base bg-ui-bg-base p-4",
      "hover:bg-ui-bg-base-hover transition-colors min-h-[7rem]"
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <Heading level="h2" className="text-base">
        {title}
      </Heading>
      {badge != null && badge !== "" ? (
        <Badge size="2xsmall">{badge}</Badge>
      ) : null}
    </div>
    <Text className="text-ui-fg-subtle text-sm mt-2">{description}</Text>
  </Link>
)

const Section = ({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) => (
  <div className="flex flex-col gap-3">
    <Heading level="h2" className="text-base">
      {title}
    </Heading>
    <div className="grid grid-cols-1 small:grid-cols-2 gap-3">{children}</div>
  </div>
)

const RestaurantHubPage = () => {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-dashboard"],
    queryFn: async () => {
      const res = await fetch("/admin/restaurant/dashboard", {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.hub.loadError"))
      return (await res.json()) as Dashboard
    },
    refetchInterval: 10000,
  })

  const action = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/admin/restaurant/dashboard", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || t("restaurant.hub.actionError"))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.hub.actionSaved"))
      qc.invalidateQueries({ queryKey: ["restaurant-dashboard"] })
      qc.invalidateQueries({ queryKey: ["restaurant-settings"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const s = data?.settings
  const counts = data?.counts

  return (
    <div className="flex flex-col gap-y-6 p-4 small:p-6 max-w-5xl mx-auto w-full">
      <div>
        <Heading level="h1">{t("restaurant.hub.title")}</Heading>
        <Text className="text-ui-fg-subtle text-sm mt-1">
          {t("restaurant.hub.subtitle")}
        </Text>
      </div>

      <Container className="p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Heading level="h2" className="text-base">
              {t("restaurant.hub.sectionOverview")}
            </Heading>
            <Text className="text-ui-fg-subtle text-sm">
              {isLoading
                ? t("restaurant.hub.loading")
                : t("restaurant.hub.liveHint", {
                    received: counts?.received ?? 0,
                    preparing:
                      (counts?.accepted ?? 0) + (counts?.preparing ?? 0),
                    ready:
                      (counts?.ready ?? 0) +
                      (counts?.out_for_delivery ?? 0),
                  })}
            </Text>
            {(counts?.overdue ?? 0) > 0 && (
              <Badge color="orange" size="2xsmall" className="mt-2">
                {t("restaurant.hub.overdue", { count: counts?.overdue })}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="small">
              <Link to="/restaurant/orders">{t("restaurant.hub.openKitchen")}</Link>
            </Button>
            <Button
              size="small"
              variant={s?.ordering_enabled ? "danger" : "primary"}
              isLoading={action.isPending}
              onClick={() =>
                action.mutate({
                  action: s?.ordering_enabled
                    ? "pause_ordering"
                    : "resume_ordering",
                })
              }
            >
              {s?.ordering_enabled
                ? t("restaurant.settings.pauseOrdering")
                : t("restaurant.settings.resumeOrdering")}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Text className="text-sm">
            {t("restaurant.hub.prepLabel")}:{" "}
            <strong>{s?.default_prep_minutes ?? "—"}</strong>{" "}
            {t("restaurant.order.min")}
          </Text>
          <Button
            size="small"
            variant="secondary"
            disabled={action.isPending}
            onClick={() => action.mutate({ action: "prep_adjust", prep_delta: 5 })}
          >
            +5
          </Button>
          <Button
            size="small"
            variant="secondary"
            disabled={action.isPending}
            onClick={() =>
              action.mutate({ action: "prep_adjust", prep_delta: 10 })
            }
          >
            +10
          </Button>
          <Button
            size="small"
            variant="secondary"
            disabled={action.isPending}
            onClick={() =>
              action.mutate({ action: "prep_reset", prep_minutes: 20 })
            }
          >
            {t("restaurant.hub.prepReset")}
          </Button>
        </div>

        {data?.today && (
          <Text className="text-sm text-ui-fg-subtle">
            {t("restaurant.hub.todayStats", {
              orders: data.today.orders,
              revenue: formatRestaurantMoney(data.today.revenue, data.today.currency_code),
              aov: formatRestaurantMoney(data.today.aov, data.today.currency_code),
            })}
          </Text>
        )}

        {!!data?.branches?.length && (
          <div className="flex flex-wrap gap-2">
            {data.branches.map((b) => (
              <Badge
                key={b.id}
                size="2xsmall"
                color={
                  b.operational_state === "open"
                    ? "green"
                    : b.operational_state === "paused"
                      ? "orange"
                      : "grey"
                }
              >
                {b.name}: {b.operational_state}
              </Badge>
            ))}
          </div>
        )}
      </Container>

      <Section title={t("restaurant.hub.sectionOps")}>
        <CardLink
          to="/restaurant/orders"
          title={t("restaurant.hub.kitchen")}
          description={t("restaurant.hub.kitchenDesc")}
          badge={counts?.active_total || null}
        />
        <CardLink
          to="/restaurant/availability"
          title={t("restaurant.hub.availability")}
          description={t("restaurant.hub.availabilityDesc")}
          badge={data?.unavailable_count || null}
        />
        <CardLink
          to="/restaurant/orders/history"
          title={t("restaurant.hub.history")}
          description={t("restaurant.hub.historyDesc")}
        />
      </Section>

      <Section title={t("restaurant.hub.sectionMenu")}>
        <CardLink
          to="/restaurant/menus"
          title={t("restaurant.hub.menus")}
          description={t("restaurant.hub.menusDesc")}
        />
        <CardLink
          to="/restaurant/modifier-groups"
          title={t("restaurant.hub.modifiers")}
          description={t("restaurant.hub.modifiersDesc")}
        />
        <CardLink
          to="/restaurant/meals"
          title={t("restaurant.hub.meals")}
          description={t("restaurant.hub.mealsDesc")}
        />
      </Section>

      <Section title={t("restaurant.hub.sectionOffers")}>
        <CardLink
          to="/restaurant/offers"
          title={t("restaurant.hub.offers")}
          description={t("restaurant.hub.offersDesc")}
        />
      </Section>

      <Section title={t("restaurant.hub.sectionBranches")}>
        <CardLink
          to="/restaurant/branches"
          title={t("restaurant.hub.branches")}
          description={t("restaurant.hub.branchesDesc")}
        />
        <CardLink
          to="/restaurant/policies"
          title={t("restaurant.hub.policies")}
          description={t("restaurant.hub.policiesDesc")}
        />
      </Section>

      <Section title={t("restaurant.hub.sectionContent")}>
        <CardLink
          to="/restaurant/content"
          title={t("restaurant.hub.content")}
          description={t("restaurant.hub.contentDesc")}
        />
        <CardLink
          to="/restaurant/translations"
          title={t("restaurant.hub.translations")}
          description={t("restaurant.hub.translationsDesc")}
        />
      </Section>

      <Section title={t("restaurant.hub.sectionSettings")}>
        <CardLink
          to="/restaurant/settings"
          title={t("restaurant.hub.settings")}
          description={t("restaurant.hub.settingsDesc")}
        />
      </Section>

      <Section title={t("restaurant.hub.sectionSystem")}>
        <CardLink
          to="/restaurant/audit"
          title={t("restaurant.hub.audit")}
          description={t("restaurant.hub.auditDesc")}
        />
        <CardLink
          to="/restaurant/outbox"
          title={t("restaurant.hub.outbox")}
          description={t("restaurant.hub.outboxDesc")}
        />
        <CardLink
          to="/orders"
          title={t("restaurant.hub.medusaOrders")}
          description={t("restaurant.hub.medusaOrdersDesc")}
        />
      </Section>

      <Container className="p-4">
        <Text className="text-ui-fg-subtle text-sm">
          {t("restaurant.hub.paymentNote")}
        </Text>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Restaurant",
  icon: Buildings,
  rank: 1,
})

export default RestaurantHubPage
