import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Buildings } from "@medusajs/icons"
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
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-modifier-groups"],
    queryFn: async () => {
      const res = await fetch("/admin/restaurant/modifier-groups", {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load modifier groups")
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
        throw new Error(err.message || "Create failed")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Modifier group created")
      setName("")
      qc.invalidateQueries({ queryKey: ["restaurant-modifier-groups"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const groups = useMemo(() => data?.modifier_groups || [], [data])

  return (
    <div className="flex flex-col gap-y-4 p-6">
      <div className="flex items-center justify-between">
        <Heading level="h1">Modifier Groups</Heading>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant/branches">Branches</Link>
        </Button>
      </div>

      <Container className="p-4 flex flex-col gap-y-3">
        <Heading level="h2">Create group</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Selection type</Label>
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
                <Select.Item value="single">Single</Select.Item>
                <Select.Item value="multiple">Multiple</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div className="flex items-center gap-x-2">
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            <Label>Required</Label>
          </div>
          <div className="flex gap-x-3">
            <div>
              <Label>Min</Label>
              <Input
                type="number"
                value={minSelections}
                onChange={(e) => setMinSelections(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Max</Label>
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
          Create group
        </Button>
      </Container>

      <Container className="p-0 overflow-hidden">
        {isLoading ? (
          <Text className="p-4">Loading…</Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>Required</Table.HeaderCell>
                <Table.HeaderCell>Min / Max</Table.HeaderCell>
                <Table.HeaderCell>Options</Table.HeaderCell>
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
                  <Table.Cell>{g.is_required ? "Yes" : "No"}</Table.Cell>
                  <Table.Cell>
                    {g.min_selections} / {g.max_selections}
                  </Table.Cell>
                  <Table.Cell>{g.options?.length ?? 0}</Table.Cell>
                  <Table.Cell>
                    <Button asChild size="small" variant="secondary">
                      <Link to={`/restaurant/modifier-groups/${g.id}`}>
                        Edit
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

export const config = defineRouteConfig({
  label: "Modifiers",
  icon: Buildings,
})

export default ModifierGroupsPage
