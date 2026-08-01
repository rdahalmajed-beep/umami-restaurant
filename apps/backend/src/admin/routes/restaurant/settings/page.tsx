import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

type RestaurantSettings = {
  id: string
  timezone: string
  default_locale: string
  supported_locales: string[]
  default_currency?: string
  default_prep_minutes: number
  max_item_quantity: number
  max_cart_quantity?: number | null
  auto_accept_orders: boolean
  scheduling_enabled: boolean
  lead_time_minutes: number
  schedule_slot_minutes?: number
  schedule_max_days?: number
  customer_notes_enabled: boolean
  tips_enabled: boolean
  guest_checkout_enabled?: boolean
  require_phone?: boolean
  require_email?: boolean
  show_sold_out?: boolean
  show_calories?: boolean
  show_allergens?: boolean
  price_display_mode?: string
  ordering_enabled: boolean
  bag_fee_amount?: number | null
  service_fee_amount?: number | null
  cancel_grace_minutes?: number | null
  overdue_threshold_minutes?: number
  schema_version: number
}

const RestaurantSettingsPage = () => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<RestaurantSettings>>({})

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-settings"],
    queryFn: async () => {
      const res = await fetch("/admin/restaurant/settings", {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.settings.loadError"))
      return (await res.json()) as { settings: RestaurantSettings }
    },
  })

  useEffect(() => {
    if (data?.settings) setForm(data.settings)
  }, [data])

  const save = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/admin/restaurant/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || t("restaurant.settings.saveError"))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.settings.saved"))
      qc.invalidateQueries({ queryKey: ["restaurant-settings"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const set = <K extends keyof RestaurantSettings>(
    key: K,
    value: RestaurantSettings[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const s = form

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">{t("restaurant.settings.title")}</Heading>
          <Text className="text-ui-fg-subtle text-sm">
            {t("restaurant.settings.subtitle")}
          </Text>
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant">{t("restaurant.hub.back")}</Link>
        </Button>
      </div>

      {isLoading || !data?.settings ? (
        <Text>{t("restaurant.settings.loading")}</Text>
      ) : (
        <>
          <Container className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <Heading level="h2" className="text-base">
                {t("restaurant.settings.sectionGeneral")}
              </Heading>
              <Badge
                color={s.ordering_enabled ? "green" : "orange"}
                size="2xsmall"
              >
                {s.ordering_enabled
                  ? t("restaurant.settings.open")
                  : t("restaurant.settings.closed")}
              </Badge>
            </div>
            <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
              <div>
                <Label>{t("restaurant.settings.timezone")}</Label>
                <Input
                  value={s.timezone || ""}
                  onChange={(e) => set("timezone", e.target.value)}
                />
              </div>
              <div>
                <Label>{t("restaurant.settings.locale")}</Label>
                <Input
                  value={s.default_locale || ""}
                  onChange={(e) => set("default_locale", e.target.value)}
                />
              </div>
              <div>
                <Label>{t("restaurant.settings.currency")}</Label>
                <Input
                  value={s.default_currency || "bhd"}
                  onChange={(e) => set("default_currency", e.target.value)}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!s.ordering_enabled}
                onCheckedChange={(v) => set("ordering_enabled", v)}
              />
              {t("restaurant.settings.ordering")}
            </label>
          </Container>

          <Container className="p-4 flex flex-col gap-3">
            <Heading level="h2" className="text-base">
              {t("restaurant.settings.sectionCheckout")}
            </Heading>
            <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
              <div>
                <Label>{t("restaurant.settings.maxQty")}</Label>
                <Input
                  type="number"
                  value={s.max_item_quantity ?? 20}
                  onChange={(e) =>
                    set("max_item_quantity", Number(e.target.value))
                  }
                />
              </div>
              <div>
                <Label>{t("restaurant.settings.maxCartQty")}</Label>
                <Input
                  type="number"
                  value={s.max_cart_quantity ?? ""}
                  onChange={(e) =>
                    set(
                      "max_cart_quantity",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>
              <div>
                <Label>{t("restaurant.settings.bagFee")}</Label>
                <Input
                  type="number"
                  value={s.bag_fee_amount ?? ""}
                  onChange={(e) =>
                    set(
                      "bag_fee_amount",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>
              <div>
                <Label>{t("restaurant.settings.serviceFee")}</Label>
                <Input
                  type="number"
                  value={s.service_fee_amount ?? ""}
                  onChange={(e) =>
                    set(
                      "service_fee_amount",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!s.guest_checkout_enabled}
                onCheckedChange={(v) => set("guest_checkout_enabled", v)}
              />
              {t("restaurant.settings.guestCheckout")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!s.require_phone}
                onCheckedChange={(v) => set("require_phone", v)}
              />
              {t("restaurant.settings.requirePhone")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!s.require_email}
                onCheckedChange={(v) => set("require_email", v)}
              />
              {t("restaurant.settings.requireEmail")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!s.customer_notes_enabled}
                onCheckedChange={(v) => set("customer_notes_enabled", v)}
              />
              {t("restaurant.settings.customerNotes")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!s.tips_enabled}
                onCheckedChange={(v) => set("tips_enabled", v)}
              />
              {t("restaurant.settings.tips")}
            </label>
          </Container>

          <Container className="p-4 flex flex-col gap-3">
            <Heading level="h2" className="text-base">
              {t("restaurant.settings.sectionKitchen")}
            </Heading>
            <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
              <div>
                <Label>{t("restaurant.settings.prep")}</Label>
                <Input
                  type="number"
                  value={s.default_prep_minutes ?? 20}
                  onChange={(e) =>
                    set("default_prep_minutes", Number(e.target.value))
                  }
                />
              </div>
              <div>
                <Label>{t("restaurant.settings.overdueThreshold")}</Label>
                <Input
                  type="number"
                  value={s.overdue_threshold_minutes ?? 15}
                  onChange={(e) =>
                    set("overdue_threshold_minutes", Number(e.target.value))
                  }
                />
              </div>
              <div>
                <Label>{t("restaurant.settings.cancelGrace")}</Label>
                <Input
                  type="number"
                  value={s.cancel_grace_minutes ?? ""}
                  onChange={(e) =>
                    set(
                      "cancel_grace_minutes",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!s.auto_accept_orders}
                onCheckedChange={(v) => set("auto_accept_orders", v)}
              />
              {t("restaurant.settings.autoAccept")}
            </label>
          </Container>

          <Container className="p-4 flex flex-col gap-3">
            <Heading level="h2" className="text-base">
              {t("restaurant.settings.sectionScheduling")}
            </Heading>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!s.scheduling_enabled}
                onCheckedChange={(v) => set("scheduling_enabled", v)}
              />
              {t("restaurant.settings.schedulingEnabled")}
            </label>
            <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
              <div>
                <Label>{t("restaurant.settings.leadTime")}</Label>
                <Input
                  type="number"
                  value={s.lead_time_minutes ?? 0}
                  onChange={(e) =>
                    set("lead_time_minutes", Number(e.target.value))
                  }
                />
              </div>
              <div>
                <Label>{t("restaurant.settings.slotMinutes")}</Label>
                <Input
                  type="number"
                  value={s.schedule_slot_minutes ?? 15}
                  onChange={(e) =>
                    set("schedule_slot_minutes", Number(e.target.value))
                  }
                />
              </div>
              <div>
                <Label>{t("restaurant.settings.scheduleMaxDays")}</Label>
                <Input
                  type="number"
                  value={s.schedule_max_days ?? 7}
                  onChange={(e) =>
                    set("schedule_max_days", Number(e.target.value))
                  }
                />
              </div>
            </div>
          </Container>

          <Container className="p-4 flex flex-col gap-3">
            <Heading level="h2" className="text-base">
              {t("restaurant.settings.sectionDisplay")}
            </Heading>
            <div>
              <Label>{t("restaurant.settings.priceDisplay")}</Label>
              <select
                className="border border-ui-border-base rounded-md px-3 py-2 w-full"
                value={s.price_display_mode || "from"}
                onChange={(e) => set("price_display_mode", e.target.value)}
              >
                <option value="exact">exact</option>
                <option value="from">from</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!s.show_sold_out}
                onCheckedChange={(v) => set("show_sold_out", v)}
              />
              {t("restaurant.settings.showSoldOut")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!s.show_calories}
                onCheckedChange={(v) => set("show_calories", v)}
              />
              {t("restaurant.settings.showCalories")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!!s.show_allergens}
                onCheckedChange={(v) => set("show_allergens", v)}
              />
              {t("restaurant.settings.showAllergens")}
            </label>
          </Container>

          <Button
            isLoading={save.isPending}
            onClick={() =>
              save.mutate({
                timezone: s.timezone,
                default_locale: s.default_locale,
                default_currency: s.default_currency,
                default_prep_minutes: s.default_prep_minutes,
                max_item_quantity: s.max_item_quantity,
                max_cart_quantity: s.max_cart_quantity,
                auto_accept_orders: s.auto_accept_orders,
                scheduling_enabled: s.scheduling_enabled,
                lead_time_minutes: s.lead_time_minutes,
                schedule_slot_minutes: s.schedule_slot_minutes,
                schedule_max_days: s.schedule_max_days,
                customer_notes_enabled: s.customer_notes_enabled,
                tips_enabled: s.tips_enabled,
                guest_checkout_enabled: s.guest_checkout_enabled,
                require_phone: s.require_phone,
                require_email: s.require_email,
                show_sold_out: s.show_sold_out,
                show_calories: s.show_calories,
                show_allergens: s.show_allergens,
                price_display_mode: s.price_display_mode,
                ordering_enabled: s.ordering_enabled,
                bag_fee_amount: s.bag_fee_amount,
                service_fee_amount: s.service_fee_amount,
                cancel_grace_minutes: s.cancel_grace_minutes,
                overdue_threshold_minutes: s.overdue_threshold_minutes,
              })
            }
          >
            {t("restaurant.settings.save")}
          </Button>
        </>
      )}
    </div>
  )
}

export default RestaurantSettingsPage
