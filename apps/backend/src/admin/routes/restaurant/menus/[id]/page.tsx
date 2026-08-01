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
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

type MenuProduct = {
  id: string
  product_id: string
  sort_order?: number
  is_featured?: boolean
}

type MenuSection = {
  id: string
  title: string
  title_i18n_json?: Record<string, string> | null
  sort_order?: number
  products?: MenuProduct[]
}

type MenuDetail = {
  id: string
  title: string
  status: string
  sections?: MenuSection[]
}

type ProductHit = {
  id: string
  title: string
  thumbnail?: string | null
}

const MenuDetailPage = () => {
  const { id } = useParams()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [sectionTitle, setSectionTitle] = useState("")
  const [sectionId, setSectionId] = useState("")
  const [productQ, setProductQ] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<ProductHit[]>([])
  const [sectionTitleAr, setSectionTitleAr] = useState("")
  const [sectionTitleEn, setSectionTitleEn] = useState("")
  const [i18nSectionId, setI18nSectionId] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-menu", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/admin/restaurant/menus/${id}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.menus.loadError"))
      return (await res.json()) as { menu: MenuDetail }
    },
  })

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

  const postMenu = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/admin/restaurant/menus/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || t("restaurant.menus.attachError"))
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant-menu", id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const addSection = () => {
    postMenu.mutate(
      { action: "add_section", title: sectionTitle },
      {
        onSuccess: () => {
          toast.success(t("restaurant.menus.sectionAdded"))
          setSectionTitle("")
        },
      }
    )
  }

  const attachSelected = async () => {
    if (!sectionId || !selectedProducts.length) return
    for (const [idx, p] of selectedProducts.entries()) {
      await postMenu.mutateAsync({
        action: "attach_product",
        section_id: sectionId,
        product_id: p.id,
        sort_order: idx,
      })
    }
    toast.success(t("restaurant.menus.attached"))
    setSelectedProducts([])
    setProductQ("")
  }

  const moveProduct = (
    section: MenuSection,
    product: MenuProduct,
    direction: -1 | 1
  ) => {
    const products = [...(section.products || [])].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    )
    const index = products.findIndex((p) => p.id === product.id)
    const swapWith = index + direction
    if (index < 0 || swapWith < 0 || swapWith >= products.length) return
    const a = products[index]
    const b = products[swapWith]
    const aSort = a.sort_order ?? index
    const bSort = b.sort_order ?? swapWith
    postMenu.mutate(
      {
        action: "reorder_product",
        menu_product_id: a.id,
        sort_order: bSort,
      },
      {
        onSuccess: () => {
          postMenu.mutate({
            action: "reorder_product",
            menu_product_id: b.id,
            sort_order: aSort,
          })
        },
      }
    )
  }

  const saveSectionI18n = () => {
    if (!i18nSectionId) return
    postMenu.mutate(
      {
        action: "update_section",
        section_id: i18nSectionId,
        title_i18n_json: {
          ar: sectionTitleAr || undefined,
          en: sectionTitleEn || undefined,
        },
        title: sectionTitleEn || sectionTitleAr || undefined,
      },
      {
        onSuccess: () => toast.success(t("restaurant.menus.sectionSaved")),
      }
    )
  }

  const menu = data?.menu

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">{menu?.title || t("restaurant.menus.title")}</Heading>
          {menu && <Badge size="2xsmall">{menu.status}</Badge>}
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant/menus">{t("restaurant.menus.back")}</Link>
        </Button>
      </div>

      {isLoading || !menu ? (
        <Text>{t("restaurant.menus.loading")}</Text>
      ) : (
        <>
          <Text className="text-sm text-ui-fg-subtle">
            {t("restaurant.menus.previewNote")}
          </Text>

          <Container className="p-4 flex flex-col gap-3">
            <Heading level="h2" className="text-base">
              {t("restaurant.menus.addSection")}
            </Heading>
            <Input
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              placeholder={t("restaurant.menus.sectionName")}
            />
            <Button
              disabled={!sectionTitle.trim() || postMenu.isPending}
              onClick={addSection}
            >
              {t("restaurant.menus.addSection")}
            </Button>
          </Container>

          <Container className="p-4 flex flex-col gap-3">
            <Heading level="h2" className="text-base">
              {t("restaurant.menus.sectionI18n")}
            </Heading>
            <select
              className="border border-ui-border-base rounded-md px-3 py-2 w-full"
              value={i18nSectionId}
              onChange={(e) => {
                const sid = e.target.value
                setI18nSectionId(sid)
                const section = (menu.sections || []).find((s) => s.id === sid)
                setSectionTitleAr(section?.title_i18n_json?.ar || "")
                setSectionTitleEn(
                  section?.title_i18n_json?.en || section?.title || ""
                )
              }}
            >
              <option value="">{t("restaurant.menus.selectSection")}</option>
              {(menu.sections || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
            <div>
              <Label>{t("restaurant.menus.titleAr")}</Label>
              <Input
                value={sectionTitleAr}
                onChange={(e) => setSectionTitleAr(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("restaurant.menus.titleEn")}</Label>
              <Input
                value={sectionTitleEn}
                onChange={(e) => setSectionTitleEn(e.target.value)}
              />
            </div>
            <Button
              disabled={!i18nSectionId || postMenu.isPending}
              onClick={saveSectionI18n}
            >
              {t("restaurant.menus.saveSectionI18n")}
            </Button>
          </Container>

          <Container className="p-4 flex flex-col gap-3">
            <Heading level="h2" className="text-base">
              {t("restaurant.menus.attachProduct")}
            </Heading>
            <div>
              <Label>{t("restaurant.menus.section")}</Label>
              <select
                className="border border-ui-border-base rounded-md px-3 py-2 w-full"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              >
                <option value="">{t("restaurant.menus.selectSection")}</option>
                {(menu.sections || []).map((s) => (
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
                placeholder={t("restaurant.availability.searchPlaceholder")}
              />
              {(productsData?.products || []).length > 0 && (
                <ul className="mt-2 border border-ui-border-base rounded-md divide-y divide-ui-border-base max-h-48 overflow-auto">
                  {productsData!.products.map((p) => {
                    const selected = selectedProducts.some((x) => x.id === p.id)
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-ui-bg-base-hover"
                          onClick={() =>
                            setSelectedProducts((prev) =>
                              selected
                                ? prev.filter((x) => x.id !== p.id)
                                : [...prev, p]
                            )
                          }
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
                          <span className="text-sm flex-1">{p.title}</span>
                          {selected ? (
                            <Badge size="2xsmall">✓</Badge>
                          ) : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {selectedProducts.length ? (
                <Text className="text-sm mt-2">
                  {t("restaurant.menus.selectedCount", {
                    count: selectedProducts.length,
                  })}
                </Text>
              ) : null}
            </div>
            <Button
              disabled={
                !sectionId ||
                !selectedProducts.length ||
                postMenu.isPending
              }
              isLoading={postMenu.isPending}
              onClick={() => void attachSelected()}
            >
              {t("restaurant.menus.attach")}
            </Button>
          </Container>

          <div className="flex flex-col gap-3">
            {(menu.sections || []).map((s) => {
              const products = [...(s.products || [])].sort(
                (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
              )
              return (
                <Container key={s.id} className="p-4 flex flex-col gap-2">
                  <Heading level="h2" className="text-base">
                    {s.title}
                  </Heading>
                  {products.length ? (
                    <ul className="text-sm flex flex-col gap-2">
                      {products.map((p, idx) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span>
                            {p.product_id}
                            {p.is_featured ? " ★" : ""}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              size="small"
                              variant="secondary"
                              disabled={idx === 0 || postMenu.isPending}
                              onClick={() => moveProduct(s, p, -1)}
                            >
                              ↑
                            </Button>
                            <Button
                              size="small"
                              variant="secondary"
                              disabled={
                                idx === products.length - 1 ||
                                postMenu.isPending
                              }
                              onClick={() => moveProduct(s, p, 1)}
                            >
                              ↓
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Text className="text-ui-fg-subtle text-sm">
                      {t("restaurant.menus.noProducts")}
                    </Text>
                  )}
                </Container>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default MenuDetailPage
