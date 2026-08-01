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

type MenuRow = {
  id: string
  title: string
  subtitle?: string | null
  status: string
  applies_delivery: boolean
  applies_pickup: boolean
  sections?: { id: string }[]
}

const MenusPage = () => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [title, setTitle] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-menus"],
    queryFn: async () => {
      const res = await fetch("/admin/restaurant/menus", {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.menus.loadError"))
      return (await res.json()) as { menus: MenuRow[] }
    },
  })

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/admin/restaurant/menus", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error(t("restaurant.menus.createError"))
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.menus.created"))
      setTitle("")
      qc.invalidateQueries({ queryKey: ["restaurant-menus"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const publish = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/admin/restaurant/menus/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      })
      if (!res.ok) throw new Error(t("restaurant.menus.publishError"))
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.menus.published"))
      qc.invalidateQueries({ queryKey: ["restaurant-menus"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">{t("restaurant.menus.title")}</Heading>
          <Text className="text-ui-fg-subtle text-sm">
            {t("restaurant.menus.subtitle")}
          </Text>
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant">{t("restaurant.hub.back")}</Link>
        </Button>
      </div>

      <Container className="p-4 flex flex-col gap-3">
        <Heading level="h2" className="text-base">
          {t("restaurant.menus.createTitle")}
        </Heading>
        <div>
          <Label>{t("restaurant.menus.name")}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <Button
          disabled={!title.trim() || create.isPending}
          isLoading={create.isPending}
          onClick={() => create.mutate()}
        >
          {t("restaurant.menus.create")}
        </Button>
      </Container>

      {isLoading ? (
        <Text>{t("restaurant.menus.loading")}</Text>
      ) : (
        <div className="flex flex-col gap-2">
          {(data?.menus || []).map((m) => (
            <Container
              key={m.id}
              className="p-3 flex items-center justify-between gap-3"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <Text className="font-medium">{m.title}</Text>
                <div className="flex gap-2 flex-wrap">
                  <Badge size="2xsmall">{m.status}</Badge>
                  <Badge size="2xsmall" color="blue">
                    {(m.sections || []).length} {t("restaurant.menus.sections")}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button asChild size="small" variant="secondary">
                  <Link to={`/restaurant/menus/${m.id}`}>
                    {t("restaurant.menus.edit")}
                  </Link>
                </Button>
                {m.status !== "published" && (
                  <Button
                    size="small"
                    isLoading={publish.isPending}
                    onClick={() => publish.mutate(m.id)}
                  >
                    {t("restaurant.menus.publish")}
                  </Button>
                )}
              </div>
            </Container>
          ))}
        </div>
      )}
    </div>
  )
}

export default MenusPage
