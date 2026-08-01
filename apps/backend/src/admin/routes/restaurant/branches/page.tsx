import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Switch,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

type Branch = {
  id: string
  name: string
  slug: string
  phone?: string | null
  address?: string | null
  is_active: boolean
  is_paused?: boolean
  pause_reason?: string | null
  accepts_delivery: boolean
  accepts_pickup: boolean
  preparation_minutes: number
}

const BranchesPage = () => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-branches"],
    queryFn: async () => {
      const res = await fetch("/admin/restaurant/branches", {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.branches.loadError"))
      return (await res.json()) as { branches: Branch[] }
    },
  })

  const [name, setName] = useState("Main Branch")
  const [slug, setSlug] = useState("main-branch")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [prep, setPrep] = useState(20)

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/admin/restaurant/branches", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          phone: phone || null,
          address: address || null,
          preparation_minutes: prep,
          is_active: true,
          accepts_delivery: true,
          accepts_pickup: true,
        }),
      })
      if (!res.ok) throw new Error(t("restaurant.branches.createError"))
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.branches.created"))
      qc.invalidateQueries({ queryKey: ["restaurant-branches"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleActive = useMutation({
    mutationFn: async (branch: Branch) => {
      const res = await fetch(`/admin/restaurant/branches/${branch.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !branch.is_active }),
      })
      if (!res.ok) throw new Error(t("restaurant.branches.updateError"))
      return res.json()
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["restaurant-branches"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const togglePause = useMutation({
    mutationFn: async (branch: Branch) => {
      let reason: string | null = null
      if (!branch.is_paused) {
        reason =
          window.prompt(t("restaurant.branchDetail.pauseReasonPrompt")) || ""
        if (!reason.trim()) {
          throw new Error(t("restaurant.branches.pauseReasonRequired"))
        }
      }
      const res = await fetch(
        `/admin/restaurant/branches/${branch.id}/pause`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paused: !branch.is_paused,
            reason: branch.is_paused ? null : reason,
          }),
        }
      )
      if (!res.ok) throw new Error(t("restaurant.branches.updateError"))
      return res.json()
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["restaurant-branches"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex flex-col gap-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <Heading level="h1">{t("restaurant.branches.title")}</Heading>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant">{t("restaurant.hub.back")}</Link>
        </Button>
      </div>

      <Container className="p-4 flex flex-col gap-y-3">
        <Heading level="h2">{t("restaurant.branches.createTitle")}</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>{t("restaurant.branches.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("restaurant.branches.slug")}</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div>
            <Label>{t("restaurant.branches.phone")}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>{t("restaurant.branches.address")}</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("restaurant.branches.prepMinutes")}</Label>
            <Input
              type="number"
              value={prep}
              onChange={(e) => setPrep(Number(e.target.value))}
            />
          </div>
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!name || !slug || createMutation.isPending}
          isLoading={createMutation.isPending}
        >
          {t("restaurant.branches.create")}
        </Button>
      </Container>

      <Container className="p-0 overflow-hidden">
        {isLoading ? (
          <Text className="p-4">{t("restaurant.branches.loading")}</Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>
                  {t("restaurant.branches.name")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.branches.slug")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.branches.deliveryPickup")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.branches.prep")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.branches.active")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.branches.paused")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.branches.actions")}
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(data?.branches || []).map((b) => (
                <Table.Row key={b.id}>
                  <Table.Cell>{b.name}</Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall">{b.slug}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {b.accepts_delivery ? "D" : "-"} /{" "}
                    {b.accepts_pickup ? "P" : "-"}
                  </Table.Cell>
                  <Table.Cell>{b.preparation_minutes}m</Table.Cell>
                  <Table.Cell>
                    <Switch
                      checked={b.is_active}
                      onCheckedChange={() => toggleActive.mutate(b)}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-col gap-1">
                      <Button
                        size="small"
                        variant={b.is_paused ? "primary" : "secondary"}
                        isLoading={togglePause.isPending}
                        onClick={() => togglePause.mutate(b)}
                      >
                        {b.is_paused
                          ? t("restaurant.branches.resume")
                          : t("restaurant.branches.pause")}
                      </Button>
                      {b.is_paused && b.pause_reason ? (
                        <Text className="text-xs text-ui-fg-subtle">
                          {b.pause_reason}
                        </Text>
                      ) : null}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Button asChild size="small" variant="secondary">
                      <Link to={`/restaurant/branches/${b.id}`}>
                        {t("restaurant.branches.edit")}
                      </Link>
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

export default BranchesPage
