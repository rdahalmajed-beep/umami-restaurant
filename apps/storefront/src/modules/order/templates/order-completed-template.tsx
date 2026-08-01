import { Heading, Text } from "@modules/common/components/ui"
import { cookies as nextCookies } from "next/headers"

import CartTotals from "@modules/common/components/cart-totals"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import KitchenStatusTracker from "@modules/order/components/kitchen-status-tracker"
import { HttpTypes } from "@medusajs/types"
import {
  getOrderRestaurantStatus,
  claimOrderRestaurantAccess,
} from "@lib/data/restaurant"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()
  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  const restaurantMeta = (order.metadata?.restaurant || {}) as {
    order_type?: "delivery" | "pickup"
    branch_id?: string
    guest_access_token?: string
  }

  let accessToken = restaurantMeta.guest_access_token || null
  if (!accessToken && order.email) {
    accessToken = await claimOrderRestaurantAccess(order.id, order.email)
  }

  const statusPayload = await getOrderRestaurantStatus(order.id, accessToken)
  const kitchenStatus =
    statusPayload.restaurant_order?.status || "received"
  const orderType =
    statusPayload.restaurant_order?.order_type ||
    restaurantMeta.order_type ||
    null
  const branch = statusPayload.branch
  const prepMinutes = branch?.preparation_minutes ?? 20

  return (
    <div className="umami-atmosphere py-6 min-h-[calc(100vh-64px)]">
      <div className="content-container flex flex-col justify-center items-center gap-y-8 max-w-4xl h-full w-full">
        {isOnboarding && <OnboardingCta orderId={order.id} />}
        <div
          className="flex flex-col gap-5 max-w-4xl h-full bg-white/90 w-full py-8 px-4 small:px-8 border border-umami-ink/10"
          data-testid="order-complete-container"
        >
          <Heading
            level="h1"
            className="flex flex-col gap-y-2 text-umami-ink font-display text-3xl mb-2"
          >
            <span>Order confirmed</span>
            <span className="text-base font-sans font-normal text-umami-ink/60">
              We&apos;re prepping your food at the kitchen.
            </span>
          </Heading>

          <div className="grid grid-cols-2 small:grid-cols-4 gap-3">
            <div className="bg-umami-mist/60 p-3">
              <Text className="text-xs text-umami-ink/50">Order #</Text>
              <Text
                className="font-semibold text-umami-ink"
                data-testid="order-id"
              >
                {order.display_id}
              </Text>
            </div>
          </div>

          <KitchenStatusTracker
            orderId={order.id}
            accessToken={accessToken}
            initialStatus={kitchenStatus}
            orderType={orderType}
            prepMinutes={prepMinutes}
            branchName={branch?.name || null}
          />

          <LocalizedClientLink
            href={`/order/${order.id}/status${
              accessToken
                ? `?token=${encodeURIComponent(accessToken)}`
                : ""
            }`}
            className="text-sm text-umami-leaf underline underline-offset-2"
            data-testid="open-live-status"
          >
            Open live kitchen status
          </LocalizedClientLink>

          {branch?.address ? (
            <div data-testid="order-branch">
              <Text className="text-xs text-umami-ink/50">Address</Text>
              <Text className="text-sm text-umami-ink/60">{branch.address}</Text>
            </div>
          ) : null}

          <OrderDetails order={order} showStatus />
          <Heading level="h2" className="font-display text-2xl text-umami-ink">
            Summary
          </Heading>
          <Items order={order} />
          <CartTotals totals={order} />
          <ShippingDetails order={order} />
          <PaymentDetails order={order} />
          <Help />
        </div>
      </div>
    </div>
  )
}
