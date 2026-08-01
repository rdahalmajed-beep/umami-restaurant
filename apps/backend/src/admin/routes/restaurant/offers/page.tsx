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
import { useState } from "react"
import { Link } from "react-router-dom"
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
  priority?: number
}

const OffersPage = () => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [internalName, setInternalName] = useState("")
  const [title, setTitle] = useState("")
  const [offerType, setOfferType] = useState<string>("percent_order")
  const [minOrder, setMinOrder] = useState("")
  const [percent, setPercent] = useState("")
  const [amount, setAmount] = useState("")
  const [maxDiscount, setMaxDiscount] = useState("")
  const [buyQty, setBuyQty] = useState("")
  const [getQty, setGetQty] = useState("")
  const [bundleQty, setBundleQty] = useState("")
  const [bundlePrice, setBundlePrice] = useState("")
  const [freeDeliveryMin, setFreeDeliveryMin] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-offers"],
    queryFn: async () => {
      const res = await fetch("/admin/restaurant/offers", {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.offers.loadError"))
      return (await res.json()) as { offers: Offer[] }
    },
  })

  const create = useMutation({
    mutationFn: async () => {
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

      const res = await fetch("/admin/restaurant/offers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internal_name: internalName || title,
          title,
          offer_type: offerType,
          rules_json,
          status: "draft",
        }),
      })
      if (!res.ok) throw new Error(t("restaurant.offers.createError"))
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.offers.created"))
      setTitle("")
      setInternalName("")
      qc.invalidateQueries({ queryKey: ["restaurant-offers"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">{t("restaurant.offers.title")}</Heading>
          <Text className="text-ui-fg-subtle text-sm">
            {t("restaurant.offers.subtitle")}
          </Text>
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant">{t("restaurant.hub.back")}</Link>
        </Button>
      </div>

      <Container className="p-4 flex flex-col gap-3">
        <Heading level="h2" className="text-base">
          {t("restaurant.offers.createTitle")}
        </Heading>
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
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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
        <Button
          disabled={!title.trim() || create.isPending}
          isLoading={create.isPending}
          onClick={() => create.mutate()}
        >
          {t("restaurant.offers.create")}
        </Button>
      </Container>

      {isLoading ? (
        <Text>{t("restaurant.offers.loading")}</Text>
      ) : (
        <div className="flex flex-col gap-2">
          {(data?.offers || []).map((o) => (
            <Container
              key={o.id}
              className="p-4 flex items-center justify-between gap-3"
            >
              <div>
                <Text className="font-medium">{o.title}</Text>
                <div className="flex gap-2 mt-1">
                  <Badge size="2xsmall">{o.status}</Badge>
                  <Badge size="2xsmall">{o.offer_type}</Badge>
                </div>
              </div>
              <Button asChild size="small" variant="secondary">
                <Link to={`/restaurant/offers/${o.id}`}>
                  {t("restaurant.offers.edit")}
                </Link>
              </Button>
            </Container>
          ))}
          {!(data?.offers || []).length ? (
            <Text className="text-ui-fg-subtle">
              {t("restaurant.offers.empty")}
            </Text>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default OffersPage
