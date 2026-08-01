import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import {
  getFulfillmentPolicies,
  listActiveBranches,
} from "@lib/data/restaurant"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Cart",
  description: "View your cart",
}

export default async function Cart() {
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const customer = await retrieveCustomer()
  const branches = await listActiveBranches()
  const restaurant = (cart?.metadata?.restaurant || {}) as {
    branch_id?: string
    order_type?: "delivery" | "pickup"
  }

  const policies =
    restaurant.branch_id && restaurant.order_type
      ? await getFulfillmentPolicies({
          branchId: restaurant.branch_id,
          orderType: restaurant.order_type,
        })
      : []

  return (
    <CartTemplate
      cart={cart}
      customer={customer}
      branches={branches}
      policy={policies[0] || null}
    />
  )
}
