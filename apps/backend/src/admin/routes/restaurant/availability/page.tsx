import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

type Branch = { id: string; name: string }
type Availability = {
  id: string
  branch_id: string
  resource_type: string
  resource_id: string
  available: boolean
  reason_code?: string | null
  display_mode?: string | null
  ends_at?: string | null
  version?: number
}
type ProductHit = {
  id: string
  title: string
  thumbnail?: string | null
}

const endOfDayIso = () => {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

const AvailabilityPage = () => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [branchId, setBranchId] = useState("")
  const [productQ, setProductQ] = useState("")
  const [selected, setSelected] = useState<ProductHit | null>(null)
  const [reasonCode, setReasonCode] = useState("sold_out")
  const [displayMode, setDisplayMode] = useState<
    "sold_out" | "hide" | "visible_disabled"
  >("sold_out")
  const [untilEod, setUntilEod] = useState(true)

  const { data: branchesData } = useQuery({
    queryKey: ["restaurant-branches"],
    queryFn: async () => {
      const res = await fetch("/admin/restaurant/branches", {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.branches.loadError"))
      return (await res.json()) as { branches: Branch[] }
    },
  })

  const { data: unavailable, isLoading } = useQuery({
    queryKey: ["restaurant-availability", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const params = new URLSearchParams({
        branch_id: branchId,
        available: "false",
      })
      const res = await fetch(
        `/admin/restaurant/availability?${params}`,
        { credentials: "include" }
      )
      if (!res.ok) throw new Error(t("restaurant.availability.loadError"))
      return (await res.json()) as { availabilities: Availability[] }
    },
  })

  const { data: productsData, isFetching: searching } = useQuery({
    queryKey: ["admin-products-search", productQ],
    enabled: productQ.trim().length >= 1,
    queryFn: async () => {
      const params = new URLSearchParams({
        q: productQ.trim(),
        limit: "20",
      })
      const res = await fetch(`/admin/products?${params}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.availability.productSearchError"))
      return (await res.json()) as { products: ProductHit[] }
    },
  })

  const productTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of productsData?.products || []) {
      map.set(p.id, p.title)
    }
    if (selected) map.set(selected.id, selected.title)
    return map
  }, [productsData, selected])

  const setAvailability = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/admin/restaurant/availability", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || t("restaurant.availability.saveError"))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.availability.saved"))
      qc.invalidateQueries({ queryKey: ["restaurant-availability"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const markUnavailable = () => {
    if (!branchId || !selected) return
    setAvailability.mutate({
      branch_id: branchId,
      resource_type: "product",
      resource_id: selected.id,
      available: false,
      reason_code: reasonCode,
      display_mode: displayMode,
      ends_at: untilEod ? endOfDayIso() : null,
    })
  }

  return (
    <div className="flex flex-col gap-y-4 p-4 small:p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">{t("restaurant.availability.title")}</Heading>
          <Text className="text-ui-fg-subtle text-sm">
            {t("restaurant.availability.subtitle")}
          </Text>
        </div>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant">{t("restaurant.hub.back")}</Link>
        </Button>
      </div>

      <Container className="p-4 flex flex-col gap-3">
        <div>
          <Label>{t("restaurant.availability.branch")}</Label>
          <select
            className="border border-ui-border-base rounded-md px-3 py-2 w-full"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">{t("restaurant.availability.selectBranch")}</option>
            {(branchesData?.branches || []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
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
            disabled={!branchId}
          />
          {searching ? (
            <Text className="text-sm text-ui-fg-subtle mt-1">
              {t("restaurant.availability.searching")}
            </Text>
          ) : null}
          {(productsData?.products || []).length > 0 && (
            <ul className="mt-2 border border-ui-border-base rounded-md divide-y divide-ui-border-base max-h-48 overflow-auto">
              {productsData!.products.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-ui-bg-base-hover"
                    onClick={() => {
                      setSelected(p)
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
          {selected ? (
            <Badge size="2xsmall" className="mt-2">
              {selected.title}
            </Badge>
          ) : null}
        </div>

        <div className="grid grid-cols-1 small:grid-cols-3 gap-3">
          <div>
            <Label>{t("restaurant.availability.reason")}</Label>
            <select
              className="border border-ui-border-base rounded-md px-3 py-2 w-full"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
            >
              <option value="sold_out">{t("restaurant.availability.reasonSoldOut")}</option>
              <option value="out_of_stock">{t("restaurant.availability.reasonOos")}</option>
              <option value="prep_delay">{t("restaurant.availability.reasonPrep")}</option>
              <option value="other">{t("restaurant.availability.reasonOther")}</option>
            </select>
          </div>
          <div>
            <Label>{t("restaurant.availability.displayMode")}</Label>
            <select
              className="border border-ui-border-base rounded-md px-3 py-2 w-full"
              value={displayMode}
              onChange={(e) =>
                setDisplayMode(
                  e.target.value as "sold_out" | "hide" | "visible_disabled"
                )
              }
            >
              <option value="sold_out">
                {t("restaurant.availability.modeSoldOut")}
              </option>
              <option value="hide">{t("restaurant.availability.modeHide")}</option>
              <option value="visible_disabled">
                {t("restaurant.availability.modeDisabled")}
              </option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={untilEod}
                onChange={(e) => setUntilEod(e.target.checked)}
              />
              {t("restaurant.availability.untilEod")}
            </label>
          </div>
        </div>

        <Button
          disabled={!branchId || !selected || setAvailability.isPending}
          isLoading={setAvailability.isPending}
          onClick={markUnavailable}
        >
          {t("restaurant.availability.markUnavailable")}
        </Button>
      </Container>

      <Container className="p-0 overflow-hidden">
        <div className="p-4 border-b border-ui-border-base">
          <Heading level="h2" className="text-base">
            {t("restaurant.availability.unavailableList")}
          </Heading>
        </div>
        {!branchId ? (
          <Text className="p-4 text-ui-fg-subtle">
            {t("restaurant.availability.selectBranchHint")}
          </Text>
        ) : isLoading ? (
          <Text className="p-4">{t("restaurant.availability.loading")}</Text>
        ) : !(unavailable?.availabilities || []).length ? (
          <Text className="p-4 text-ui-fg-subtle">
            {t("restaurant.availability.empty")}
          </Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>
                  {t("restaurant.availability.resource")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.availability.reason")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.availability.displayMode")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.availability.actions")}
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(unavailable?.availabilities || []).map((row) => (
                <Table.Row key={row.id}>
                  <Table.Cell>
                    <div className="flex flex-col gap-0.5">
                      <Text className="text-sm">
                        {productTitleById.get(row.resource_id) ||
                          row.resource_id}
                      </Text>
                      <Text className="text-xs text-ui-fg-muted">
                        {row.resource_type}
                      </Text>
                    </div>
                  </Table.Cell>
                  <Table.Cell>{row.reason_code || "—"}</Table.Cell>
                  <Table.Cell>{row.display_mode || "—"}</Table.Cell>
                  <Table.Cell>
                    <Button
                      size="small"
                      variant="secondary"
                      isLoading={setAvailability.isPending}
                      onClick={() =>
                        setAvailability.mutate({
                          branch_id: row.branch_id,
                          resource_type: row.resource_type,
                          resource_id: row.resource_id,
                          available: true,
                          reason_code: null,
                          display_mode: null,
                          ends_at: null,
                          expected_version: row.version,
                        })
                      }
                    >
                      {t("restaurant.availability.restore")}
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Container>
    </div>
  )
}

export default AvailabilityPage
