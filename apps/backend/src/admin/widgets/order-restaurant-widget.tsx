import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import { Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

type ModifierSnap = {
  group_name: string
  option_name: string
  price_adjustment: number
}

type RestaurantMeta = {
  order_type?: string
  branch_id?: string
  branch_name?: string
  customer_note?: string
  estimated_preparation_minutes?: number
}

const OrderRestaurantWidget = ({
  data: order,
}: DetailWidgetProps<AdminOrder>) => {
  const { t } = useTranslation()
  const restaurant = (order.metadata?.restaurant || {}) as RestaurantMeta
  const items = order.items || []

  return (
    <Container className="p-4 flex flex-col gap-y-3">
      <Heading level="h2">{t("restaurant.order.title")}</Heading>
      <div className="text-sm flex flex-col gap-y-1">
        <Text>
          {t("restaurant.order.type")}{" "}
          <strong>{restaurant.order_type || "—"}</strong>
        </Text>
        <Text>
          {t("restaurant.order.branch")}{" "}
          <strong>
            {restaurant.branch_name || restaurant.branch_id || "—"}
          </strong>
        </Text>
        {restaurant.estimated_preparation_minutes != null && (
          <Text>
            {t("restaurant.order.estPrep")}{" "}
            {restaurant.estimated_preparation_minutes}{" "}
            {t("restaurant.order.min")}
          </Text>
        )}
        {restaurant.customer_note && (
          <Text>
            {t("restaurant.order.note")} {restaurant.customer_note}
          </Text>
        )}
      </div>

      <Heading level="h3">{t("restaurant.order.itemModifiers")}</Heading>
      {items.map((item) => {
        const meta = (item.metadata || {}) as {
          restaurant_modifiers?: ModifierSnap[]
          restaurant_note?: string
          modifiers_unit_price?: number
        }
        const mods = meta.restaurant_modifiers || []
        if (!mods.length && !meta.restaurant_note) {
          return null
        }
        return (
          <div key={item.id} className="border-t border-ui-border-base pt-2">
            <Text className="font-medium">{item.title}</Text>
            {mods.map((m, i) => (
              <Text key={i} className="text-ui-fg-subtle text-sm">
                {m.group_name}: {m.option_name}
                {Number(m.price_adjustment) > 0
                  ? ` (+${Number(m.price_adjustment).toFixed(3)} BHD)`
                  : ""}
              </Text>
            ))}
            {meta.restaurant_note && (
              <Text className="text-sm italic">
                {t("restaurant.order.note")} {meta.restaurant_note}
              </Text>
            )}
          </div>
        )
      })}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default OrderRestaurantWidget
