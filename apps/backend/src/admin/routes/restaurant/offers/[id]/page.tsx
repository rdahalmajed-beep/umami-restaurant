import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

const OFFER_TYPES = [
  "percent_order",
  "amount_order",
  "percent_item",
  "fixed_item_price",
  "bogo",
  "second_half",
  "bundle_n",
  "free_delivery",
  "happy_hour",
  "first_order_code",
] as const

type Offer = {
  id: string
  internal_name: string
  title: string
  offer_type: string
  status: string
  rules_json?: Record<string, unknown> | null
}

type Simulation = {
  eligible: boolean
  reasons: string[]
  discount: number
  free_delivery?: boolean
}

const OfferDetailPage = () => {
  const { id } = useParams()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [title, setTitle] = useState("")
  const [internalName, setInternalName] = useState("")
  const [offerType, setOfferType] = useState("percent_order")
  const [minOrder, setMinOrder] = useState("")
  const [percent, setPercent] = useState("")
  const [amount, setAmount] = useState("")
  const [maxDiscount, setMaxDiscount] = useState("")
  const [buyQty, setBuyQty] = useState("")
  const [getQty, setGetQty] = useState("")
  const [bundleQty, setBundleQty] = useState("")
  const [bundlePrice, setBundlePrice] = useState("")
  const [freeDeliveryMin, setFreeDeliveryMin] = useState("")
  const [subtotal, setSubtotal] = useState("10")
  const [simulation, setSimulation] = useState<Simulation | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-offer", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/admin/restaurant/offers/${id}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.offers.loadError"))
      return (await res.json()) as { offer: Offer }
    },
  })

  useEffect(() => {
    const o = data?.offer
    if (!o) return
    setTitle(o.title || "")
    setInternalName(o.internal_name || "")
    setOfferType(o.offer_type || "percent_order")
    const r = (o.rules_json || {}) as Record<string, number>
    setMinOrder(r.min_order != null ? String(r.min_order) : "")
    setPercent(r.percent != null ? String(r.percent) : "")
    setAmount(r.amount != null ? String(r.amount) : "")
    setMaxDiscount(r.max_discount != null ? String(r.max_discount) : "")
    setBuyQty(r.buy_qty != null ? String(r.buy_qty) : "")
    setGetQty(r.get_qty != null ? String(r.get_qty) : "")
    setBundleQty(r.bundle_qty != null ? String(r.bundle_qty) : "")
    setBundlePrice(r.bundle_price != null ? String(r.bundle_price) : "")
    setFreeDeliveryMin(
      r.free_delivery_min != null ? String(r.free_delivery_min) : ""
    )
  }, [data])

  const buildRules = () => {
    const rules_json: Record<string, number> = {}
    if (minOrder) rules_json.min_order = Number(minOrder)
    if (percent) rules_json.percent = Number(percent)
    if (amount) rules_json.amount = Number(amount)
    if (maxDiscount) rules_json.max_discount = Number(maxDiscount)
    if (buyQty) rules_json.buy_qty = Number(buyQty)
    if (getQty) rules_json.get_qty = Number(getQty)
    if (bundleQty) rules_json.bundle_qty = Number(bundleQty)
    if (bundlePrice) rules_json.bundle_price = Number(bundlePrice)
    if (freeDeliveryMin) rules_json.free_delivery_min = Number(freeDeliveryMin)
    return rules_json
  }

  const mutateOffer = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/admin/restaurant/offers/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || t("restaurant.offers.saveError"))
      }
      return res.json() as Promise<{
        offer?: Offer
        simulation?: Simulation
      }>
    },
    onSuccess: (res, vars) => {
      if (vars.action === "simulate" && res.simulation) {
        setSimulation(res.simulation)
        return
      }
      toast.success(t("restaurant.offers.saved"))
      qc.invalidateQueries({ queryKey: ["restaurant-offer", id] })
      qc.invalidateQueries({ queryKey: ["restaurant-offers"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const offer = data?.offer

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">
            {offer?.title || t("restaurant.offers.title")}
          </Heading>
          {offer ? <Badge size="2xsmall">{offer.status}</Badge> : null}
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant/offers">{t("restaurant.offers.back")}</Link>
        </Button>
      </div>

      {isLoading || !offer ? (
        <Text>{t("restaurant.offers.loading")}</Text>
      ) : (
        <>
          <Container className="p-4 flex flex-col gap-3">
            <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
              <div>
                <Label>{t("restaurant.offers.internalName")}</Label>
                <Input
                  value={internalName}
                  onChange={(e) => setInternalName(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("restaurant.offers.name")}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="small:col-span-2">
                <Label>{t("restaurant.offers.offerType")}</Label>
                <select
                  className="border border-ui-border-base rounded-md px-3 py-2 w-full"
                  value={offerType}
                  onChange={(e) => setOfferType(e.target.value)}
                >
                  {OFFER_TYPES.map((ot) => (
                    <option key={ot} value={ot}>
                      {ot}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>{t("restaurant.offers.minOrder")}</Label>
                <Input
                  type="number"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("restaurant.offers.percent")}</Label>
                <Input
                  type="number"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("restaurant.offers.amount")}</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("restaurant.offers.maxDiscount")}</Label>
                <Input
                  type="number"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("restaurant.offers.buyQty")}</Label>
                <Input
                  type="number"
                  value={buyQty}
                  onChange={(e) => setBuyQty(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("restaurant.offers.getQty")}</Label>
                <Input
                  type="number"
                  value={getQty}
                  onChange={(e) => setGetQty(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("restaurant.offers.bundleQty")}</Label>
                <Input
                  type="number"
                  value={bundleQty}
                  onChange={(e) => setBundleQty(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("restaurant.offers.bundlePrice")}</Label>
                <Input
                  type="number"
                  value={bundlePrice}
                  onChange={(e) => setBundlePrice(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("restaurant.offers.freeDeliveryMin")}</Label>
                <Input
                  type="number"
                  value={freeDeliveryMin}
                  onChange={(e) => setFreeDeliveryMin(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                isLoading={mutateOffer.isPending}
                onClick={() =>
                  mutateOffer.mutate({
                    title,
                    internal_name: internalName,
                    offer_type: offerType,
                    rules_json: buildRules(),
                  })
                }
              >
                {t("restaurant.offers.save")}
              </Button>
              <Button
                variant="secondary"
                isLoading={mutateOffer.isPending}
                onClick={() => mutateOffer.mutate({ action: "activate" })}
              >
                {t("restaurant.offers.activate")}
              </Button>
              <Button
                variant="danger"
                isLoading={mutateOffer.isPending}
                onClick={() => mutateOffer.mutate({ action: "pause" })}
              >
                {t("restaurant.offers.pause")}
              </Button>
            </div>
          </Container>

          <Container className="p-4 flex flex-col gap-3">
            <Heading level="h2" className="text-base">
              {t("restaurant.offers.simulate")}
            </Heading>
            <div>
              <Label>{t("restaurant.offers.subtotal")}</Label>
              <Input
                type="number"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              isLoading={mutateOffer.isPending}
              onClick={() =>
                mutateOffer.mutate({
                  action: "simulate",
                  simulate_cart: { subtotal: Number(subtotal) || 0 },
                })
              }
            >
              {t("restaurant.offers.runSimulate")}
            </Button>
            {simulation ? (
              <div className="text-sm flex flex-col gap-1">
                <Text>
                  {t("restaurant.offers.eligible")}:{" "}
                  {simulation.eligible
                    ? t("restaurant.offers.yes")
                    : t("restaurant.offers.no")}
                </Text>
                <Text>
                  {t("restaurant.offers.discount")}: {simulation.discount}
                </Text>
                {simulation.reasons?.length ? (
                  <Text className="text-ui-fg-subtle">
                    {t("restaurant.offers.reasons")}:{" "}
                    {simulation.reasons.join(", ")}
                  </Text>
                ) : null}
              </div>
            ) : null}
          </Container>
        </>
      )}
    </div>
  )
}

export default OfferDetailPage
