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
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

type Tab = "general" | "hours" | "exceptions" | "delivery" | "capacity"

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

type DayHours = { open: string; close: string }

type BranchDetail = {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  accepts_delivery: boolean
  accepts_pickup: boolean
  delivery_paused?: boolean
  pickup_paused?: boolean
  is_active: boolean
  is_paused?: boolean
  pause_reason?: string | null
  timezone?: string | null
  opening_hours_json?: Record<string, unknown> | null
  preparation_minutes: number
  prep_override_minutes?: number | null
  prep_override_until?: string | null
  capacity_orders_per_hour?: number | null
  scheduling_enabled?: boolean
  slot_minutes?: number
  max_orders_per_slot?: number | null
  schedule_max_days?: number
}

type Exception = {
  id: string
  title: string
  kind?: string
  starts_at: string
  ends_at: string
  is_active?: boolean
}

type Zone = {
  id: string
  name: string
  fee_amount?: number
  min_order_amount?: number
  estimated_minutes?: number
  is_active?: boolean
}

const emptyDays = (): Record<(typeof DAY_KEYS)[number], DayHours> =>
  Object.fromEntries(
    DAY_KEYS.map((d) => [d, { open: "09:00", close: "22:00" }])
  ) as Record<(typeof DAY_KEYS)[number], DayHours>

const parseDays = (
  json: Record<string, unknown> | null | undefined
): Record<(typeof DAY_KEYS)[number], DayHours> => {
  const base = emptyDays()
  if (!json) return base
  const source =
    json.days && typeof json.days === "object"
      ? (json.days as Record<string, unknown>)
      : json
  for (const d of DAY_KEYS) {
    const raw = source[d]
    if (typeof raw === "string" && raw.includes("-")) {
      const [open, close] = raw.split("-").map((s) => s.trim())
      base[d] = { open: open || "09:00", close: close || "22:00" }
    } else if (Array.isArray(raw) && raw[0] && typeof raw[0] === "object") {
      const row = raw[0] as { open?: string; close?: string }
      base[d] = {
        open: row.open || "09:00",
        close: row.close || "22:00",
      }
    }
  }
  return base
}

const BranchDetailPage = () => {
  const { id } = useParams()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>("general")

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [acceptsDelivery, setAcceptsDelivery] = useState(true)
  const [acceptsPickup, setAcceptsPickup] = useState(true)
  const [deliveryPaused, setDeliveryPaused] = useState(false)
  const [pickupPaused, setPickupPaused] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [timezone, setTimezone] = useState("Asia/Bahrain")
  const [days, setDays] = useState(emptyDays())

  const [prep, setPrep] = useState(20)
  const [prepOverride, setPrepOverride] = useState("")
  const [prepOverrideUntil, setPrepOverrideUntil] = useState("")
  const [capacity, setCapacity] = useState("")
  const [schedulingEnabled, setSchedulingEnabled] = useState(false)
  const [slotMinutes, setSlotMinutes] = useState(15)
  const [maxPerSlot, setMaxPerSlot] = useState("")
  const [scheduleMaxDays, setScheduleMaxDays] = useState(7)

  const [exTitle, setExTitle] = useState("")
  const [exKind, setExKind] = useState("closed")
  const [exStart, setExStart] = useState("")
  const [exEnd, setExEnd] = useState("")

  const [zoneName, setZoneName] = useState("")
  const [zoneFee, setZoneFee] = useState(0)
  const [zoneMin, setZoneMin] = useState(0)
  const [zoneEta, setZoneEta] = useState(30)

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-branch", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/admin/restaurant/branches/${id}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.branchDetail.loadError"))
      return (await res.json()) as {
        branch: BranchDetail
        operational_state: string
        zones: Zone[]
        exceptions: Exception[]
      }
    },
  })

  useEffect(() => {
    const b = data?.branch
    if (!b) return
    setName(b.name || "")
    setPhone(b.phone || "")
    setEmail(b.email || "")
    setAddress(b.address || "")
    setAcceptsDelivery(!!b.accepts_delivery)
    setAcceptsPickup(!!b.accepts_pickup)
    setDeliveryPaused(!!b.delivery_paused)
    setPickupPaused(!!b.pickup_paused)
    setIsActive(!!b.is_active)
    setTimezone(b.timezone || "Asia/Bahrain")
    setDays(parseDays(b.opening_hours_json))
    setPrep(b.preparation_minutes || 20)
    setPrepOverride(
      b.prep_override_minutes != null ? String(b.prep_override_minutes) : ""
    )
    setPrepOverrideUntil(
      b.prep_override_until
        ? new Date(b.prep_override_until).toISOString().slice(0, 16)
        : ""
    )
    setCapacity(
      b.capacity_orders_per_hour != null
        ? String(b.capacity_orders_per_hour)
        : ""
    )
    setSchedulingEnabled(!!b.scheduling_enabled)
    setSlotMinutes(b.slot_minutes || 15)
    setMaxPerSlot(
      b.max_orders_per_slot != null ? String(b.max_orders_per_slot) : ""
    )
    setScheduleMaxDays(b.schedule_max_days || 7)
  }, [data])

  const saveBranch = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/admin/restaurant/branches/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || t("restaurant.branchDetail.saveError"))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.branchDetail.saved"))
      qc.invalidateQueries({ queryKey: ["restaurant-branch", id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const pauseMutation = useMutation({
    mutationFn: async (body: {
      paused: boolean
      reason?: string | null
      pause_until?: string | null
    }) => {
      const res = await fetch(`/admin/restaurant/branches/${id}/pause`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(t("restaurant.branches.updateError"))
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.branchDetail.saved"))
      qc.invalidateQueries({ queryKey: ["restaurant-branch", id] })
      qc.invalidateQueries({ queryKey: ["restaurant-branches"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const createException = useMutation({
    mutationFn: async () => {
      const res = await fetch("/admin/restaurant/branch-exceptions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: id,
          title: exTitle,
          kind: exKind,
          starts_at: new Date(exStart).toISOString(),
          ends_at: new Date(exEnd).toISOString(),
          is_active: true,
        }),
      })
      if (!res.ok) throw new Error(t("restaurant.branchDetail.exceptionError"))
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.branchDetail.exceptionCreated"))
      setExTitle("")
      qc.invalidateQueries({ queryKey: ["restaurant-branch", id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const createZone = useMutation({
    mutationFn: async () => {
      const res = await fetch("/admin/restaurant/delivery-zones", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: id,
          name: zoneName,
          fee_amount: zoneFee,
          min_order_amount: zoneMin,
          estimated_minutes: zoneEta,
          is_active: true,
        }),
      })
      if (!res.ok) throw new Error(t("restaurant.branchDetail.zoneError"))
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.branchDetail.zoneCreated"))
      setZoneName("")
      qc.invalidateQueries({ queryKey: ["restaurant-branch", id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const tabs: { id: Tab; label: string }[] = [
    { id: "general", label: t("restaurant.branchDetail.tabGeneral") },
    { id: "hours", label: t("restaurant.branchDetail.tabHours") },
    { id: "exceptions", label: t("restaurant.branchDetail.tabExceptions") },
    { id: "delivery", label: t("restaurant.branchDetail.tabDelivery") },
    { id: "capacity", label: t("restaurant.branchDetail.tabCapacity") },
  ]

  const branch = data?.branch

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">
            {branch?.name || t("restaurant.branchDetail.title")}
          </Heading>
          {data?.operational_state ? (
            <Badge size="2xsmall" className="mt-1">
              {data.operational_state}
            </Badge>
          ) : null}
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant/branches">{t("restaurant.branchDetail.back")}</Link>
        </Button>
      </div>

      {isLoading || !branch ? (
        <Text>{t("restaurant.branchDetail.loading")}</Text>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {tabs.map((item) => (
              <Button
                key={item.id}
                size="small"
                variant={tab === item.id ? "primary" : "secondary"}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          {tab === "general" && (
            <Container className="p-4 flex flex-col gap-3">
              <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
                <div>
                  <Label>{t("restaurant.branches.name")}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>{t("restaurant.branches.phone")}</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t("restaurant.branchDetail.email")}</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t("restaurant.branches.address")}</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={acceptsDelivery}
                    onCheckedChange={setAcceptsDelivery}
                  />
                  {t("restaurant.branchDetail.acceptsDelivery")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={acceptsPickup}
                    onCheckedChange={setAcceptsPickup}
                  />
                  {t("restaurant.branchDetail.acceptsPickup")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={deliveryPaused}
                    onCheckedChange={setDeliveryPaused}
                  />
                  {t("restaurant.branchDetail.deliveryPaused")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={pickupPaused}
                    onCheckedChange={setPickupPaused}
                  />
                  {t("restaurant.branchDetail.pickupPaused")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  {t("restaurant.branches.active")}
                </label>
              </div>
              <Button
                isLoading={saveBranch.isPending}
                onClick={() =>
                  saveBranch.mutate({
                    name,
                    phone: phone || null,
                    email: email || null,
                    address: address || null,
                    accepts_delivery: acceptsDelivery,
                    accepts_pickup: acceptsPickup,
                    delivery_paused: deliveryPaused,
                    pickup_paused: pickupPaused,
                    is_active: isActive,
                  })
                }
              >
                {t("restaurant.branchDetail.save")}
              </Button>

              <div className="border-t border-ui-border-base pt-3 flex flex-col gap-2">
                <Heading level="h2" className="text-base">
                  {t("restaurant.branchDetail.pauseTitle")}
                </Heading>
                {branch.is_paused ? (
                  <Text className="text-sm text-ui-fg-subtle">
                    {branch.pause_reason || t("restaurant.branches.paused")}
                  </Text>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={branch.is_paused ? "primary" : "danger"}
                    isLoading={pauseMutation.isPending}
                    onClick={() => {
                      if (branch.is_paused) {
                        pauseMutation.mutate({ paused: false, reason: null })
                        return
                      }
                      const reason =
                        window.prompt(
                          t("restaurant.branchDetail.pauseReasonPrompt")
                        ) || ""
                      if (!reason.trim()) return
                      const mins = window.prompt(
                        t("restaurant.branchDetail.pauseDurationPrompt"),
                        "60"
                      )
                      const until =
                        mins && Number(mins) > 0
                          ? new Date(
                              Date.now() + Number(mins) * 60_000
                            ).toISOString()
                          : null
                      pauseMutation.mutate({
                        paused: true,
                        reason: reason.trim(),
                        pause_until: until,
                      })
                    }}
                  >
                    {branch.is_paused
                      ? t("restaurant.branches.resume")
                      : t("restaurant.branches.pause")}
                  </Button>
                </div>
              </div>
            </Container>
          )}

          {tab === "hours" && (
            <Container className="p-4 flex flex-col gap-3">
              <div>
                <Label>{t("restaurant.branchDetail.timezone")}</Label>
                <Input
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                {DAY_KEYS.map((d) => (
                  <div
                    key={d}
                    className="grid grid-cols-[4rem_1fr_1fr] gap-2 items-center"
                  >
                    <Text className="text-sm uppercase">{d}</Text>
                    <Input
                      value={days[d].open}
                      onChange={(e) =>
                        setDays((prev) => ({
                          ...prev,
                          [d]: { ...prev[d], open: e.target.value },
                        }))
                      }
                      placeholder="09:00"
                    />
                    <Input
                      value={days[d].close}
                      onChange={(e) =>
                        setDays((prev) => ({
                          ...prev,
                          [d]: { ...prev[d], close: e.target.value },
                        }))
                      }
                      placeholder="22:00"
                    />
                  </div>
                ))}
              </div>
              <Button
                isLoading={saveBranch.isPending}
                onClick={() => {
                  const opening_hours_json: Record<
                    string,
                    { open: string; close: string }[]
                  > = {}
                  for (const d of DAY_KEYS) {
                    opening_hours_json[d] = [
                      { open: days[d].open, close: days[d].close },
                    ]
                  }
                  saveBranch.mutate({ timezone, opening_hours_json })
                }}
              >
                {t("restaurant.branchDetail.saveHours")}
              </Button>
            </Container>
          )}

          {tab === "exceptions" && (
            <Container className="p-4 flex flex-col gap-3">
              <Heading level="h2" className="text-base">
                {t("restaurant.branchDetail.createException")}
              </Heading>
              <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
                <div>
                  <Label>{t("restaurant.branchDetail.exceptionTitle")}</Label>
                  <Input
                    value={exTitle}
                    onChange={(e) => setExTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t("restaurant.branchDetail.exceptionKind")}</Label>
                  <select
                    className="border border-ui-border-base rounded-md px-3 py-2 w-full"
                    value={exKind}
                    onChange={(e) => setExKind(e.target.value)}
                  >
                    <option value="closed">closed</option>
                    <option value="special_hours">special_hours</option>
                    <option value="capacity_override">capacity_override</option>
                  </select>
                </div>
                <div>
                  <Label>{t("restaurant.branchDetail.startsAt")}</Label>
                  <Input
                    type="datetime-local"
                    value={exStart}
                    onChange={(e) => setExStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t("restaurant.branchDetail.endsAt")}</Label>
                  <Input
                    type="datetime-local"
                    value={exEnd}
                    onChange={(e) => setExEnd(e.target.value)}
                  />
                </div>
              </div>
              <Button
                disabled={!exTitle || !exStart || !exEnd}
                isLoading={createException.isPending}
                onClick={() => createException.mutate()}
              >
                {t("restaurant.branchDetail.addException")}
              </Button>
              <div className="flex flex-col gap-2 pt-2 border-t border-ui-border-base">
                {(data?.exceptions || []).map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>
                      {ex.title} · {ex.kind || "closed"}
                    </span>
                    <Badge size="2xsmall">
                      {new Date(ex.starts_at).toLocaleString()} –{" "}
                      {new Date(ex.ends_at).toLocaleString()}
                    </Badge>
                  </div>
                ))}
                {!(data?.exceptions || []).length ? (
                  <Text className="text-ui-fg-subtle text-sm">
                    {t("restaurant.branchDetail.noExceptions")}
                  </Text>
                ) : null}
              </div>
            </Container>
          )}

          {tab === "delivery" && (
            <Container className="p-4 flex flex-col gap-3">
              <Text className="text-sm text-ui-fg-subtle">
                {t("restaurant.branchDetail.feeNote")}
              </Text>
              <Heading level="h2" className="text-base">
                {t("restaurant.branchDetail.createZone")}
              </Heading>
              <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
                <div>
                  <Label>{t("restaurant.branchDetail.zoneName")}</Label>
                  <Input
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t("restaurant.branchDetail.feeAmount")}</Label>
                  <Input
                    type="number"
                    value={zoneFee}
                    onChange={(e) => setZoneFee(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>{t("restaurant.branchDetail.minOrder")}</Label>
                  <Input
                    type="number"
                    value={zoneMin}
                    onChange={(e) => setZoneMin(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>{t("restaurant.branchDetail.eta")}</Label>
                  <Input
                    type="number"
                    value={zoneEta}
                    onChange={(e) => setZoneEta(Number(e.target.value))}
                  />
                </div>
              </div>
              <Button
                disabled={!zoneName.trim()}
                isLoading={createZone.isPending}
                onClick={() => createZone.mutate()}
              >
                {t("restaurant.branchDetail.addZone")}
              </Button>
              <div className="flex flex-col gap-2 pt-2 border-t border-ui-border-base">
                {(data?.zones || []).map((z) => (
                  <div
                    key={z.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>{z.name}</span>
                    <Badge size="2xsmall">
                      fee {z.fee_amount ?? 0} · min {z.min_order_amount ?? 0} ·{" "}
                      {z.estimated_minutes ?? "—"}m
                    </Badge>
                  </div>
                ))}
                {!(data?.zones || []).length ? (
                  <Text className="text-ui-fg-subtle text-sm">
                    {t("restaurant.branchDetail.noZones")}
                  </Text>
                ) : null}
              </div>
            </Container>
          )}

          {tab === "capacity" && (
            <Container className="p-4 flex flex-col gap-3">
              <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
                <div>
                  <Label>{t("restaurant.branches.prepMinutes")}</Label>
                  <Input
                    type="number"
                    value={prep}
                    onChange={(e) => setPrep(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>{t("restaurant.branchDetail.prepOverride")}</Label>
                  <Input
                    type="number"
                    value={prepOverride}
                    onChange={(e) => setPrepOverride(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t("restaurant.branchDetail.prepOverrideUntil")}</Label>
                  <Input
                    type="datetime-local"
                    value={prepOverrideUntil}
                    onChange={(e) => setPrepOverrideUntil(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t("restaurant.branchDetail.capacityPerHour")}</Label>
                  <Input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t("restaurant.branchDetail.slotMinutes")}</Label>
                  <Input
                    type="number"
                    value={slotMinutes}
                    onChange={(e) => setSlotMinutes(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>{t("restaurant.branchDetail.maxPerSlot")}</Label>
                  <Input
                    type="number"
                    value={maxPerSlot}
                    onChange={(e) => setMaxPerSlot(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t("restaurant.branchDetail.scheduleMaxDays")}</Label>
                  <Input
                    type="number"
                    value={scheduleMaxDays}
                    onChange={(e) => setScheduleMaxDays(Number(e.target.value))}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={schedulingEnabled}
                  onCheckedChange={setSchedulingEnabled}
                />
                {t("restaurant.branchDetail.schedulingEnabled")}
              </label>
              <Button
                isLoading={saveBranch.isPending}
                onClick={() =>
                  saveBranch.mutate({
                    preparation_minutes: prep,
                    prep_override_minutes: prepOverride
                      ? Number(prepOverride)
                      : null,
                    prep_override_until: prepOverrideUntil
                      ? new Date(prepOverrideUntil).toISOString()
                      : null,
                    capacity_orders_per_hour: capacity
                      ? Number(capacity)
                      : null,
                    scheduling_enabled: schedulingEnabled,
                    slot_minutes: slotMinutes,
                    max_orders_per_slot: maxPerSlot
                      ? Number(maxPerSlot)
                      : null,
                    schedule_max_days: scheduleMaxDays,
                  })
                }
              >
                {t("restaurant.branchDetail.save")}
              </Button>
            </Container>
          )}
        </>
      )}
    </div>
  )
}

export default BranchDetailPage
