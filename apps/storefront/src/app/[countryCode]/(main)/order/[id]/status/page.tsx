import { Metadata } from "next"
import KitchenStatusTracker from "@modules/order/components/kitchen-status-tracker"
import {
  claimOrderRestaurantAccess,
  getOrderRestaurantStatus,
} from "@lib/data/restaurant"
import { retrieveOrder } from "@lib/data/orders"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Props = {
  params: Promise<{ id: string; countryCode: string }>
  searchParams: Promise<{ token?: string }>
}

export const metadata: Metadata = {
  title: "Order status",
  description: "Live kitchen status for your order",
}

export default async function OrderStatusPage(props: Props) {
  const { id } = await props.params
  const { token: tokenParam } = await props.searchParams

  const order = await retrieveOrder(id).catch(() => null)
  let accessToken = tokenParam || null

  if (!accessToken && order?.email) {
    accessToken = await claimOrderRestaurantAccess(id, order.email)
  }

  const meta = (order?.metadata?.restaurant || {}) as {
    guest_access_token?: string
    order_type?: string
  }
  if (!accessToken && meta.guest_access_token) {
    accessToken = meta.guest_access_token
  }

  const statusPayload = await getOrderRestaurantStatus(id, accessToken)
  const kitchenStatus =
    statusPayload.restaurant_order?.status || "received"
  const orderType =
    statusPayload.restaurant_order?.order_type || meta.order_type || null
  const branch = statusPayload.branch

  return (
    <div className="umami-atmosphere min-h-[calc(100vh-64px)] py-10">
      <div className="content-container max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl text-umami-ink">
            Kitchen status
          </h1>
          <p className="text-sm text-umami-ink/60 mt-1">
            Order {order?.display_id ? `#${order.display_id}` : id}
          </p>
        </div>

        {!statusPayload.restaurant_order && !accessToken ? (
          <p className="text-sm text-umami-terracotta">
            Open this page from your confirmation link, or use the same email
            used at checkout.
          </p>
        ) : (
          <KitchenStatusTracker
            orderId={id}
            accessToken={accessToken}
            initialStatus={kitchenStatus}
            orderType={orderType}
            prepMinutes={branch?.preparation_minutes ?? 20}
            branchName={branch?.name || null}
          />
        )}

        <LocalizedClientLink
          href="/store"
          className="text-sm text-umami-leaf underline underline-offset-2 w-fit"
        >
          Back to menu
        </LocalizedClientLink>
      </div>
    </div>
  )
}
