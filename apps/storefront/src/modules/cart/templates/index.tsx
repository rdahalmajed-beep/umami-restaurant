import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import OrderTypeSelector from "../components/order-type-selector"
import { HttpTypes } from "@medusajs/types"
import type { StoreBranch } from "types/restaurant"

const CartTemplate = ({
  cart,
  customer,
  branches,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  branches: StoreBranch[]
}) => {
  const restaurant = (cart?.metadata?.restaurant || {}) as {
    order_type?: "delivery" | "pickup"
    branch_id?: string
  }

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
              <Divider />
              <ItemsTemplate cart={cart} />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-8 sticky top-12">
                {cart && cart.region && (
                  <>
                    <div className="bg-white py-6">
                      <Summary cart={cart} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <EmptyCartMessage />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
