import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

type ModifierOption = {
  id: string
  name: string
  price_adjustment: number
  is_default: boolean
  is_active: boolean
  sort_order: number
}

type ModifierGroup = {
  id: string
  name: string
  selection_type: "single" | "multiple"
  is_required: boolean
  min_selections: number
  max_selections: number
  sort_order: number
  options?: ModifierOption[]
}

const ModifierGroupsPage = () => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-modifier-groups"],
    queryFn: async () => {
      const res = await fetch("/admin/restaurant/modifier-groups", {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.modifiers.loadError"))
      return (await res.json()) as { modifier_groups: ModifierGroup[] }
    },
  })

  const [name, setName] = useState("")
  const [selectionType, setSelectionType] = useState<"single" | "multiple">(
    "single"
  )
  const [isRequired, setIsRequired] = useState(true)
  const [minSelections, setMinSelections] = useState(1)
  const [maxSelections, setMaxSelections] = useState(1)

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/admin/restaurant/modifier-groups", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          selection_type: selectionType,
          is_required: isRequired,
          min_selections: minSelections,
          max_selections: maxSelections,
          sort_order: (data?.modifier_groups?.length || 0) + 1,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || t("restaurant.modifiers.createError"))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.modifiers.created"))
      setName("")
      qc.invalidateQueries({ queryKey: ["restaurant-modifier-groups"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/admin/restaurant/modifier-groups/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || t("restaurant.modifiers.duplicateError"))
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.modifiers.duplicated"))
      qc.invalidateQueries({ queryKey: ["restaurant-modifier-groups"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const groups = useMemo(() => data?.modifier_groups || [], [data])

  return (
    <div className="flex flex-col gap-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <Heading level="h1">{t("restaurant.modifiers.title")}</Heading>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant">{t("restaurant.hub.back")}</Link>
        </Button>
      </div>

      <Container className="p-4 flex flex-col gap-y-3">
        <Heading level="h2">{t("restaurant.modifiers.createTitle")}</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>{t("restaurant.modifiers.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t("restaurant.modifiers.selectionType")}</Label>
            <Select
              value={selectionType}
              onValueChange={(v) =>
                setSelectionType(v as "single" | "multiple")
              }
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="single">
                  {t("restaurant.modifiers.single")}
                </Select.Item>
                <Select.Item value="multiple">
                  {t("restaurant.modifiers.multiple")}
                </Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div className="flex items-center gap-x-2">
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            <Label>{t("restaurant.modifiers.required")}</Label>
          </div>
          <div className="flex gap-x-3">
            <div>
              <Label>{t("restaurant.modifiers.min")}</Label>
              <Input
                type="number"
                value={minSelections}
                onChange={(e) => setMinSelections(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>{t("restaurant.modifiers.max")}</Label>
              <Input
                type="number"
                value={maxSelections}
                onChange={(e) => setMaxSelections(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!name || createMutation.isPending}
          isLoading={createMutation.isPending}
        >
          {t("restaurant.modifiers.create")}
        </Button>
      </Container>

      <Container className="p-0 overflow-hidden">
        {isLoading ? (
          <Text className="p-4">{t("restaurant.modifiers.loading")}</Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>
                  {t("restaurant.modifiers.name")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.modifiers.type")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.modifiers.required")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.modifiers.minMax")}
                </Table.HeaderCell>
                <Table.HeaderCell>
                  {t("restaurant.modifiers.options")}
                </Table.HeaderCell>
                <Table.HeaderCell></Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {groups.map((g) => (
                <Table.Row key={g.id}>
                  <Table.Cell>{g.name}</Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall">{g.selection_type}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {g.is_required
                      ? t("restaurant.modifiers.yes")
                      : t("restaurant.modifiers.no")}
                  </Table.Cell>
                  <Table.Cell>
                    {g.min_selections} / {g.max_selections}
                  </Table.Cell>
                  <Table.Cell>{g.options?.length ?? 0}</Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-2">
                      <Button asChild size="small" variant="secondary">
                        <Link to={`/restaurant/modifier-groups/${g.id}`}>
                          {t("restaurant.modifiers.edit")}
                        </Link>
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                        isLoading={duplicateMutation.isPending}
                        onClick={() => duplicateMutation.mutate(g.id)}
                      >
                        {t("restaurant.modifiers.duplicate")}
                      </Button>
                    </div>
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

export default ModifierGroupsPage
