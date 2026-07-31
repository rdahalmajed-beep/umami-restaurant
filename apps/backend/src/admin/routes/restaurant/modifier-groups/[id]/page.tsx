import { defineRouteConfig } from "@medusajs/admin-sdk"
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
import { Link, useParams } from "react-router-dom"

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
  const { id } = useParams()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-modifier-group", id],
    queryFn: async () => {
      const res = await fetch(`/admin/restaurant/modifier-groups/${id}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load group")
      return (await res.json()) as { modifier_group: ModifierGroup }
    },
    enabled: !!id,
  })

  const group = data?.modifier_group

  const [optName, setOptName] = useState("")
  const [optPrice, setOptPrice] = useState("0")
  const [optDefault, setOptDefault] = useState(false)

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
      if (!res.ok) throw new Error("Failed to add option")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Option added")
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
      if (!res.ok) throw new Error("Failed to update option")
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurant-modifier-group", id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading || !group) {
    return <Text className="p-6">Loading…</Text>
  }

  return (
    <div className="flex flex-col gap-y-4 p-6">
      <div className="flex items-center gap-x-3">
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant/modifier-groups">Back</Link>
        </Button>
        <Heading level="h1">{group.name}</Heading>
        <Badge size="2xsmall">{group.selection_type}</Badge>
        {group.is_required && <Badge size="2xsmall">required</Badge>}
      </div>

      <Container className="p-4 flex flex-col gap-y-3">
        <Heading level="h2">Add option</Heading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Name</Label>
            <Input value={optName} onChange={(e) => setOptName(e.target.value)} />
          </div>
          <div>
            <Label>Price adjustment (BHD)</Label>
            <Input
              value={optPrice}
              onChange={(e) => setOptPrice(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-x-2 pt-5">
            <Switch checked={optDefault} onCheckedChange={setOptDefault} />
            <Label>Default</Label>
          </div>
        </div>
        <Button
          onClick={() => addOption.mutate()}
          disabled={!optName || addOption.isPending}
          isLoading={addOption.isPending}
        >
          Add option
        </Button>
      </Container>

      <Container className="p-0 overflow-hidden">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>Price adj.</Table.HeaderCell>
              <Table.HeaderCell>Default</Table.HeaderCell>
              <Table.HeaderCell>Active</Table.HeaderCell>
              <Table.HeaderCell>Sort</Table.HeaderCell>
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
                  <Table.Cell>{o.is_default ? "Yes" : "No"}</Table.Cell>
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

export const config = defineRouteConfig({
  label: "Modifier Group",
})

export default ModifierGroupDetailPage
