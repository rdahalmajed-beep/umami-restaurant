import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import OrderTypeSelector from "../components/order-type-selector"
import { HttpTypes } from "@medusajs/types"
import type { StoreBranch, StoreFulfillmentPolicy } from "types/restaurant"
import { formatBhd } from "@lib/util/money"

const CartTemplate = ({
  cart,
  customer,
  branches,
  policy,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  branches: StoreBranch[]
  policy?: StoreFulfillmentPolicy | null
}) => {
  const restaurant = (cart?.metadata?.restaurant || {}) as {
    order_type?: "delivery" | "pickup"
    branch_id?: string
  }

  const subtotal = Number(cart?.subtotal || cart?.item_subtotal || 0)
  const minOrder = Number(policy?.min_order_amount || 0)
  const belowMin = minOrder > 0 && subtotal < minOrder

  return (
    <div className="py-12">
      <div className="content-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 small:grid-cols-[1fr_360px] gap-x-40">
            <div className="flex flex-col bg-white py-6 gap-y-6">
              {!customer && (
                <>
                  <SignInPrompt />
                  <Divider />
                </>
              )}
              <OrderTypeSelector
                branches={branches}
                initialOrderType={restaurant.order_type}
                initialBranchId={restaurant.branch_id}
              />
              {policy ? (
                <p
                  className="text-sm text-umami-ink/70 px-1"
                  data-testid="cart-policy-hint"
                >
                  {policy.is_paused
                    ? "This fulfillment type is paused for the selected branch."
                    : minOrder > 0
                      ? `Minimum order: ${minOrder} · ETA ~${policy.estimated_minutes} min`
                      : `ETA ~${policy.estimated_minutes} min`}
                  {belowMin
                    ? ` — add ${formatBhd(minOrder - subtotal)} more to checkout.`
                    : ""}
                </p>
              ) : null}
              <Divider />
              <ItemsTemplate cart={cart} />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-8 sticky top-12">
                {cart && cart.region && (
                  <div className="bg-white py-6">
                    <Summary cart={cart} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyCartMessage />
        )}
      </div>
    </div>
  )
}

export default CartTemplate
