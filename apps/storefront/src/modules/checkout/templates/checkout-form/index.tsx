import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { listActiveBranches } from "@lib/data/restaurant"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"
import OrderTypeSelector from "@modules/cart/components/order-type-selector"
import Divider from "@modules/common/components/divider"

export default async function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart) {
    return null
  }

  const [shippingMethods, paymentMethods, branches] = await Promise.all([
    listCartShippingMethods(cart.id),
    listCartPaymentMethods(cart.region?.id ?? ""),
    listActiveBranches(),
  ])

  if (!shippingMethods || !paymentMethods) {
    return null
  }

  const restaurant = (cart.metadata?.restaurant || {}) as {
    order_type?: "delivery" | "pickup"
    branch_id?: string
  }

  return (
    <div className="w-full grid grid-cols-1 gap-y-8">
      <div className="bg-white px-1">
        <h2 className="font-display text-2xl text-umami-ink mb-2">
          Delivery / Pickup
        </h2>
        <OrderTypeSelector
          branches={branches}
          initialOrderType={restaurant.order_type}
          initialBranchId={restaurant.branch_id}
        />
        <Divider className="mt-6" />
      </div>

      <Addresses cart={cart} customer={customer} branches={branches} />

      <Shipping cart={cart} availableShippingMethods={shippingMethods} />

      <Payment cart={cart} availablePaymentMethods={paymentMethods} />

      <Review cart={cart} />
    </div>
  )
}
