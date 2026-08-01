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

type Meal = {
  id: string
  title: string
  status: string
  meal_type?: string
  base_price?: number
  steps?: { id: string }[]
}

const MealsPage = () => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [title, setTitle] = useState("")
  const [mealType, setMealType] = useState("fixed")
  const [basePrice, setBasePrice] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-meals"],
    queryFn: async () => {
      const res = await fetch("/admin/restaurant/meals", {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.meals.loadError"))
      return (await res.json()) as { meals: Meal[] }
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/admin/restaurant/meals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          meal_type: mealType,
          base_price: basePrice,
          status: "draft",
        }),
      })
      if (!res.ok) throw new Error(t("restaurant.meals.createError"))
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.meals.created"))
      setTitle("")
      qc.invalidateQueries({ queryKey: ["restaurant-meals"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">{t("restaurant.meals.title")}</Heading>
          <Text className="text-ui-fg-subtle text-sm">
            {t("restaurant.meals.subtitle")}
          </Text>
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant">{t("restaurant.hub.back")}</Link>
        </Button>
      </div>

      <Container className="p-4 flex flex-col gap-3">
        <Heading level="h2" className="text-base">
          {t("restaurant.meals.createTitle")}
        </Heading>
        <div>
          <Label>{t("restaurant.meals.name")}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
          <div>
            <Label>{t("restaurant.meals.mealType")}</Label>
            <select
              className="border border-ui-border-base rounded-md px-3 py-2 w-full"
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
            >
              <option value="fixed">fixed</option>
              <option value="choose">choose</option>
              <option value="mix_match">mix_match</option>
              <option value="family">family</option>
              <option value="upgrade">upgrade</option>
              <option value="seasonal">seasonal</option>
            </select>
          </div>
          <div>
            <Label>{t("restaurant.meals.basePrice")}</Label>
            <Input
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
            />
          </div>
        </div>
        <Button
          disabled={!title.trim() || create.isPending}
          isLoading={create.isPending}
          onClick={() => create.mutate()}
        >
          {t("restaurant.meals.create")}
        </Button>
      </Container>

      {isLoading ? (
        <Text>{t("restaurant.meals.loading")}</Text>
      ) : (
        <div className="flex flex-col gap-2">
          {(data?.meals || []).map((m) => (
            <Container
              key={m.id}
              className="p-4 flex items-center justify-between gap-3"
            >
              <div>
                <Text className="font-medium">{m.title}</Text>
                <div className="flex gap-2 mt-1">
                  <Badge size="2xsmall">{m.status}</Badge>
                  {m.meal_type ? (
                    <Badge size="2xsmall">{m.meal_type}</Badge>
                  ) : null}
                </div>
              </div>
              <Button asChild size="small" variant="secondary">
                <Link to={`/restaurant/meals/${m.id}`}>
                  {t("restaurant.meals.edit")}
                </Link>
              </Button>
            </Container>
          ))}
          {!(data?.meals || []).length ? (
            <Text className="text-ui-fg-subtle">{t("restaurant.meals.empty")}</Text>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default MealsPage
