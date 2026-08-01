import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

type Policy = {
  id: string
  branch_id: string
  order_type: "delivery" | "pickup"
  min_order_amount: number
  flat_fee?: number | null
  free_threshold?: number | null
  estimated_minutes: number
  lead_time_minutes: number
  is_paused: boolean
}

type Branch = { id: string; name: string }

const FulfillmentPoliciesPage = () => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [branchId, setBranchId] = useState("")
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery")
  const [minOrder, setMinOrder] = useState(0)
  const [flatFee, setFlatFee] = useState(1)
  const [freeAt, setFreeAt] = useState(10)
  const [eta, setEta] = useState(30)
  const [lead, setLead] = useState(0)
  const [paused, setPaused] = useState(false)

  const { data: branchesData } = useQuery({
    queryKey: ["restaurant-branches"],
    queryFn: async () => {
      const res = await fetch("/admin/restaurant/branches", {
        credentials: "include",
      })
      return (await res.json()) as { branches: Branch[] }
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-fulfillment-policies"],
    queryFn: async () => {
      const res = await fetch("/admin/restaurant/fulfillment-policies", {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.policies.loadError"))
      return (await res.json()) as { policies: Policy[] }
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/admin/restaurant/fulfillment-policies", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: branchId,
          order_type: orderType,
          min_order_amount: minOrder,
          flat_fee: flatFee,
          free_threshold: freeAt,
          estimated_minutes: eta,
          lead_time_minutes: lead,
          is_paused: paused,
        }),
      })
      if (!res.ok) throw new Error(t("restaurant.policies.saveError"))
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.policies.saved"))
      qc.invalidateQueries({ queryKey: ["restaurant-fulfillment-policies"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">{t("restaurant.policies.title")}</Heading>
          <Text className="text-ui-fg-subtle text-sm">
            {t("restaurant.policies.subtitle")}
          </Text>
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant">{t("restaurant.hub.back")}</Link>
        </Button>
      </div>

      <Container className="p-4 flex flex-col gap-3">
        <div>
          <Label>{t("restaurant.policies.branch")}</Label>
          <select
            className="border border-ui-border-base rounded-md px-3 py-2 w-full"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">{t("restaurant.policies.selectBranch")}</option>
            {(branchesData?.branches || []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>{t("restaurant.policies.orderType")}</Label>
          <Select
            value={orderType}
            onValueChange={(v) => setOrderType(v as "delivery" | "pickup")}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="delivery">delivery</Select.Item>
              <Select.Item value="pickup">pickup</Select.Item>
            </Select.Content>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("restaurant.policies.minOrder")}</Label>
            <Input
              type="number"
              value={minOrder}
              onChange={(e) => setMinOrder(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>{t("restaurant.policies.flatFee")}</Label>
            <Input
              type="number"
              value={flatFee}
              onChange={(e) => setFlatFee(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>{t("restaurant.policies.freeThreshold")}</Label>
            <Input
              type="number"
              value={freeAt}
              onChange={(e) => setFreeAt(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>{t("restaurant.policies.eta")}</Label>
            <Input
              type="number"
              value={eta}
              onChange={(e) => setEta(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={paused} onCheckedChange={setPaused} />
          <Text>{t("restaurant.policies.paused")}</Text>
        </div>
        <Button
          disabled={!branchId || save.isPending}
          isLoading={save.isPending}
          onClick={() => save.mutate()}
        >
          {t("restaurant.policies.save")}
        </Button>
      </Container>

      {isLoading ? (
        <Text>{t("restaurant.policies.loading")}</Text>
      ) : (
        <div className="flex flex-col gap-2">
          {(data?.policies || []).map((p) => (
            <Container key={p.id} className="p-3 text-sm">
              <Text className="font-medium">
                {p.order_type} · {p.branch_id}
              </Text>
              <Text className="text-ui-fg-subtle">
                min {p.min_order_amount} · fee {p.flat_fee ?? "—"} · free@{" "}
                {p.free_threshold ?? "—"} · ETA {p.estimated_minutes}m
                {p.is_paused ? " · PAUSED" : ""}
              </Text>
            </Container>
          ))}
        </div>
      )}
    </div>
  )
}

export default FulfillmentPoliciesPage
