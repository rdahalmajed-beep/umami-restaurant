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

type MealStepItem = {
  id: string
  product_id: string
  label?: string | null
  upgrade_price?: number
  is_default?: boolean
}

type MealStep = {
  id: string
  title: string
  min_selections?: number
  max_selections?: number
  items?: MealStepItem[]
}

type Meal = {
  id: string
  title: string
  subtitle?: string | null
  status: string
  meal_type?: string
  pricing_mode?: string
  base_price?: number
  steps?: MealStep[]
}

type ProductHit = {
  id: string
  title: string
  thumbnail?: string | null
}

const MealDetailPage = () => {
  const { id } = useParams()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [basePrice, setBasePrice] = useState(0)
  const [stepTitle, setStepTitle] = useState("")
  const [stepId, setStepId] = useState("")
  const [productQ, setProductQ] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<ProductHit | null>(
    null
  )

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-meal", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/admin/restaurant/meals/${id}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.meals.loadError"))
      return (await res.json()) as { meal: Meal }
    },
  })

  useEffect(() => {
    const m = data?.meal
    if (!m) return
    setTitle(m.title || "")
    setSubtitle(m.subtitle || "")
    setBasePrice(m.base_price || 0)
    if (m.steps?.[0]?.id && !stepId) setStepId(m.steps[0].id)
  }, [data, stepId])

  const { data: productsData } = useQuery({
    queryKey: ["admin-products-search", productQ],
    enabled: productQ.trim().length >= 1,
    queryFn: async () => {
      const params = new URLSearchParams({ q: productQ.trim(), limit: "20" })
      const res = await fetch(`/admin/products?${params}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.availability.productSearchError"))
      return (await res.json()) as { products: ProductHit[] }
    },
  })

  const save = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/admin/restaurant/meals/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || t("restaurant.meals.saveError"))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.meals.saved"))
      qc.invalidateQueries({ queryKey: ["restaurant-meal", id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const meal = data?.meal

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">{meal?.title || t("restaurant.meals.title")}</Heading>
          {meal ? <Badge size="2xsmall">{meal.status}</Badge> : null}
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant/meals">{t("restaurant.meals.back")}</Link>
        </Button>
      </div>

      {isLoading || !meal ? (
        <Text>{t("restaurant.meals.loading")}</Text>
      ) : (
        <>
          <Container className="p-4 flex flex-col gap-3">
            <div>
              <Label>{t("restaurant.meals.name")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>{t("restaurant.meals.subtitleField")}</Label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("restaurant.meals.basePrice")}</Label>
              <Input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                isLoading={save.isPending}
                onClick={() =>
                  save.mutate({
                    title,
                    subtitle: subtitle || null,
                    base_price: basePrice,
                  })
                }
              >
                {t("restaurant.meals.save")}
              </Button>
              <Button
                variant="secondary"
                isLoading={save.isPending}
                onClick={() => save.mutate({ action: "publish" })}
              >
                {t("restaurant.meals.publish")}
              </Button>
            </div>
          </Container>

          <Container className="p-4 flex flex-col gap-3">
            <Heading level="h2" className="text-base">
              {t("restaurant.meals.addStep")}
            </Heading>
            <Input
              value={stepTitle}
              onChange={(e) => setStepTitle(e.target.value)}
              placeholder={t("restaurant.meals.stepTitle")}
            />
            <Button
              disabled={!stepTitle.trim() || save.isPending}
              onClick={() =>
                save.mutate(
                  { action: "add_step", step_title: stepTitle },
                  {
                    onSuccess: () => setStepTitle(""),
                  }
                )
              }
            >
              {t("restaurant.meals.addStep")}
            </Button>
          </Container>

          <Container className="p-4 flex flex-col gap-3">
            <Heading level="h2" className="text-base">
              {t("restaurant.meals.addStepItem")}
            </Heading>
            <div>
              <Label>{t("restaurant.meals.step")}</Label>
              <select
                className="border border-ui-border-base rounded-md px-3 py-2 w-full"
                value={stepId}
                onChange={(e) => setStepId(e.target.value)}
              >
                <option value="">{t("restaurant.meals.selectStep")}</option>
                {(meal.steps || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("restaurant.availability.searchProducts")}</Label>
              <Input
                value={productQ}
                onChange={(e) => setProductQ(e.target.value)}
              />
              {(productsData?.products || []).length > 0 && (
                <ul className="mt-2 border border-ui-border-base rounded-md divide-y divide-ui-border-base max-h-40 overflow-auto">
                  {productsData!.products.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-ui-bg-base-hover"
                        onClick={() => {
                          setSelectedProduct(p)
                          setProductQ(p.title)
                        }}
                      >
                        {p.thumbnail ? (
                          <img
                            src={p.thumbnail}
                            alt=""
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <span className="w-8 h-8 rounded bg-ui-bg-subtle inline-block" />
                        )}
                        <span className="text-sm">{p.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              disabled={!stepId || !selectedProduct || save.isPending}
              onClick={() =>
                save.mutate({
                  action: "add_step_item",
                  step_id: stepId,
                  product_id: selectedProduct!.id,
                  label: selectedProduct!.title,
                })
              }
            >
              {t("restaurant.meals.attachItem")}
            </Button>
          </Container>

          <div className="flex flex-col gap-3">
            {(meal.steps || []).map((s) => (
              <Container key={s.id} className="p-4 flex flex-col gap-2">
                <Heading level="h2" className="text-base">
                  {s.title}
                </Heading>
                {(s.items || []).length ? (
                  <ul className="text-sm flex flex-col gap-1">
                    {s.items!.map((item) => (
                      <li key={item.id}>
                        {item.label || item.product_id}
                        {item.is_default ? " ★" : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Text className="text-ui-fg-subtle text-sm">
                    {t("restaurant.meals.noItems")}
                  </Text>
                )}
              </Container>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default MealDetailPage
