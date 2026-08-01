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
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
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

const ModifierGroupDetailPage = () => {
  const { t } = useTranslation()
  const { id } = useParams()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-modifier-group", id],
    queryFn: async () => {
      const res = await fetch(`/admin/restaurant/modifier-groups/${id}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.modifiers.loadGroupError"))
      return (await res.json()) as { modifier_group: ModifierGroup }
    },
    enabled: !!id,
  })

  const group = data?.modifier_group

  const [name, setName] = useState("")
  const [isRequired, setIsRequired] = useState(true)
  const [minSelections, setMinSelections] = useState(1)
  const [maxSelections, setMaxSelections] = useState(1)
  const [optName, setOptName] = useState("")
  const [optPrice, setOptPrice] = useState("0")
  const [optDefault, setOptDefault] = useState(false)

  useEffect(() => {
    if (!group) return
    setName(group.name)
    setIsRequired(group.is_required)
    setMinSelections(group.min_selections)
    setMaxSelections(group.max_selections)
  }, [group?.id])

  const saveGroup = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/admin/restaurant/modifier-groups/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          is_required: isRequired,
          min_selections: minSelections,
          max_selections: maxSelections,
        }),
      })
      if (!res.ok) throw new Error(t("restaurant.modifiers.updateGroupError"))
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.modifiers.groupSaved"))
      qc.invalidateQueries({ queryKey: ["restaurant-modifier-group", id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const addOption = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/admin/restaurant/modifier-groups/${id}/options`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: optName,
            price_adjustment: Number(optPrice),
            is_default: optDefault,
            is_active: true,
            sort_order: (group?.options?.length || 0) + 1,
          }),
        }
      )
      if (!res.ok) throw new Error(t("restaurant.modifiers.addOptionError"))
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.modifiers.optionAdded"))
      setOptName("")
      setOptPrice("0")
      setOptDefault(false)
      qc.invalidateQueries({ queryKey: ["restaurant-modifier-group", id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleActive = useMutation({
    mutationFn: async (option: ModifierOption) => {
      const res = await fetch(
        `/admin/restaurant/modifier-options/${option.id}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: !option.is_active }),
        }
      )
      if (!res.ok) throw new Error(t("restaurant.modifiers.updateOptionError"))
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant-modifier-group", id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading || !group) {
    return <Text className="p-6">{t("restaurant.modifiers.loading")}</Text>
  }

  return (
    <div className="flex flex-col gap-y-4 p-6">
      <div className="flex items-center gap-x-3">
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant/modifier-groups">
            {t("restaurant.modifiers.detailBack")}
          </Link>
        </Button>
        <Heading level="h1">{group.name}</Heading>
        <Badge size="2xsmall">{group.selection_type}</Badge>
        {group.is_required && (
          <Badge size="2xsmall">
            {t("restaurant.modifiers.requiredBadge")}
          </Badge>
        )}
      </div>

      <Container className="p-4 flex flex-col gap-y-3">
        <Heading level="h2">{t("restaurant.modifiers.editGroup")}</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>{t("restaurant.modifiers.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex items-center gap-x-2 pt-5">
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            <Label>{t("restaurant.modifiers.required")}</Label>
          </div>
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
        <Button
          onClick={() => saveGroup.mutate()}
          isLoading={saveGroup.isPending}
          disabled={!name.trim()}
        >
          {t("restaurant.modifiers.saveGroup")}
        </Button>
      </Container>

      <Container className="p-4 flex flex-col gap-y-3">
        <Heading level="h2">{t("restaurant.modifiers.addOptionTitle")}</Heading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>{t("restaurant.modifiers.name")}</Label>
            <Input
              value={optName}
              onChange={(e) => setOptName(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("restaurant.modifiers.priceAdjustment")}</Label>
            <Input
              value={optPrice}
              onChange={(e) => setOptPrice(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-x-2 pt-5">
            <Switch checked={optDefault} onCheckedChange={setOptDefault} />
            <Label>{t("restaurant.modifiers.default")}</Label>
          </div>
        </div>
        <Button
          onClick={() => addOption.mutate()}
          disabled={!optName || addOption.isPending}
          isLoading={addOption.isPending}
        >
          {t("restaurant.modifiers.addOption")}
        </Button>
      </Container>

      <Container className="p-0 overflow-hidden">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>
                {t("restaurant.modifiers.name")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("restaurant.modifiers.priceAdj")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("restaurant.modifiers.default")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("restaurant.modifiers.active")}
              </Table.HeaderCell>
              <Table.HeaderCell>
                {t("restaurant.modifiers.sort")}
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(group.options || [])
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((o) => (
                <Table.Row key={o.id}>
                  <Table.Cell>{o.name}</Table.Cell>
                  <Table.Cell>
                    {Number(o.price_adjustment).toFixed(3)}
                  </Table.Cell>
                  <Table.Cell>
                    {o.is_default
                      ? t("restaurant.modifiers.yes")
                      : t("restaurant.modifiers.no")}
                  </Table.Cell>
                  <Table.Cell>
                    <Switch
                      checked={o.is_active}
                      onCheckedChange={() => toggleActive.mutate(o)}
                    />
                  </Table.Cell>
                  <Table.Cell>{o.sort_order}</Table.Cell>
                </Table.Row>
              ))}
          </Table.Body>
        </Table>
      </Container>
    </div>
  )
}

export default ModifierGroupDetailPage
