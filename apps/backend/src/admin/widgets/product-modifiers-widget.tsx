import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import {
  Button,
  Container,
  Heading,
  Select,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"

type ModifierGroup = {
  id: string
  name: string
  selection_type: string
  is_required: boolean
  options?: unknown[]
}

const ProductModifiersWidget = ({
  data: product,
}: DetailWidgetProps<AdminProduct>) => {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [selectedGroupId, setSelectedGroupId] = useState<string>("")

  const linked = useQuery({
    queryKey: ["product-modifier-groups", product.id],
    queryFn: async () => {
      const res = await fetch(
        `/admin/restaurant/products/${product.id}/modifier-groups`,
        { credentials: "include" }
      )
      if (!res.ok) throw new Error(t("restaurant.productModifiers.loadLinkedError"))
      return (await res.json()) as {
        modifier_groups: ModifierGroup[]
      }
    },
  })

  const allGroups = useQuery({
    queryKey: ["restaurant-modifier-groups"],
    queryFn: async () => {
      const res = await fetch("/admin/restaurant/modifier-groups", {
        credentials: "include",
      })
      if (!res.ok) throw new Error(t("restaurant.productModifiers.loadGroupsError"))
      return (await res.json()) as { modifier_groups: ModifierGroup[] }
    },
  })

  const linkMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/admin/restaurant/products/${product.id}/modifier-groups`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modifier_group_id: selectedGroupId,
            sort_order: (linked.data?.modifier_groups?.length || 0) + 1,
          }),
        }
      )
      if (!res.ok) throw new Error(t("restaurant.productModifiers.linkError"))
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.productModifiers.linked"))
      setSelectedGroupId("")
      qc.invalidateQueries({
        queryKey: ["product-modifier-groups", product.id],
      })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const unlinkMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await fetch(
        `/admin/restaurant/products/${product.id}/modifier-groups/${groupId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )
      if (!res.ok) throw new Error(t("restaurant.productModifiers.unlinkError"))
      return res.json()
    },
    onSuccess: () => {
      toast.success(t("restaurant.productModifiers.unlinked"))
      qc.invalidateQueries({
        queryKey: ["product-modifier-groups", product.id],
      })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const linkedIds = new Set(
    (linked.data?.modifier_groups || []).map((g) => g.id)
  )
  const available = (allGroups.data?.modifier_groups || []).filter(
    (g) => !linkedIds.has(g.id)
  )

  return (
    <Container className="p-4 flex flex-col gap-y-3">
      <Heading level="h2">{t("restaurant.productModifiers.title")}</Heading>
      <Text className="text-ui-fg-subtle text-sm">
        {t("restaurant.productModifiers.description")}
      </Text>

      <div className="flex gap-x-2 items-end">
        <div className="flex-1">
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <Select.Trigger>
              <Select.Value
                placeholder={t("restaurant.productModifiers.selectGroup")}
              />
            </Select.Trigger>
            <Select.Content>
              {available.map((g) => (
                <Select.Item key={g.id} value={g.id}>
                  {g.name} ({g.selection_type}
                  {g.is_required
                    ? `, ${t("restaurant.productModifiers.required")}`
                    : ""}
                  )
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <Button
          size="small"
          disabled={!selectedGroupId || linkMutation.isPending}
          isLoading={linkMutation.isPending}
          onClick={() => linkMutation.mutate()}
        >
          {t("restaurant.productModifiers.link")}
        </Button>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>
              {t("restaurant.productModifiers.group")}
            </Table.HeaderCell>
            <Table.HeaderCell>
              {t("restaurant.productModifiers.type")}
            </Table.HeaderCell>
            <Table.HeaderCell>
              {t("restaurant.productModifiers.options")}
            </Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {(linked.data?.modifier_groups || []).map((g) => (
            <Table.Row key={g.id}>
              <Table.Cell>{g.name}</Table.Cell>
              <Table.Cell>{g.selection_type}</Table.Cell>
              <Table.Cell>{g.options?.length ?? 0}</Table.Cell>
              <Table.Cell>
                <Button
                  size="small"
                  variant="danger"
                  onClick={() => unlinkMutation.mutate(g.id)}
                >
                  {t("restaurant.productModifiers.unlink")}
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductModifiersWidget
