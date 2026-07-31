import { defineRouteConfig } from "@medusajs/admin-sdk"
import { MapPin } from "@medusajs/icons"
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

type Branch = {
  id: string
  name: string
  slug: string
  phone?: string | null
  address?: string | null
  is_active: boolean
  accepts_delivery: boolean
  accepts_pickup: boolean
  preparation_minutes: number
}

const BranchesPage = () => {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-branches"],
    queryFn: async () => {
      const res = await fetch("/admin/restaurant/branches", {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load branches")
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
      if (!res.ok) throw new Error("Failed to create branch")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Branch created")
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
      if (!res.ok) throw new Error("Failed to update branch")
      return res.json()
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["restaurant-branches"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex flex-col gap-y-4 p-6">
      <div className="flex items-center justify-between">
        <Heading level="h1">Branches</Heading>
        <Button asChild variant="secondary" size="small">
          <Link to="/restaurant/modifier-groups">Modifiers</Link>
        </Button>
      </div>

      <Container className="p-4 flex flex-col gap-y-3">
        <Heading level="h2">Create branch</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div>
            <Label>Prep minutes</Label>
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
          Create branch
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
                <Table.HeaderCell>Slug</Table.HeaderCell>
                <Table.HeaderCell>Delivery / Pickup</Table.HeaderCell>
                <Table.HeaderCell>Prep</Table.HeaderCell>
                <Table.HeaderCell>Active</Table.HeaderCell>
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
  label: "Branches",
  icon: MapPin,
})

export default BranchesPage
