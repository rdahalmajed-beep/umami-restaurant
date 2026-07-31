"use client"

import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import { updateLineItem } from "@lib/data/cart"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState, useTransition } from "react"
import X from "@modules/common/icons/x"

const CartDropdown = ({
  cart: cartState,
}: {
  cart?: HttpTypes.StoreCart | null
}) => {
  const [cartOpen, setCartOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const open = () => setCartOpen(true)
  const close = () => setCartOpen(false)

  const totalItems =
    cartState?.items?.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0

  const subtotal = cartState?.subtotal ?? 0
  const shipping = cartState?.shipping_total ?? 0
  const total = cartState?.total ?? subtotal
  const itemRef = useRef<number>(totalItems || 0)

  const pathname = usePathname()

  useEffect(() => {
    if (
      itemRef.current !== totalItems &&
      !pathname.includes("/cart") &&
      !pathname.includes("/checkout")
    ) {
      open()
    }
    itemRef.current = totalItems
  }, [totalItems, pathname])

  const changeQty = (lineId: string, quantity: number) => {
    if (quantity < 1) return
    startTransition(async () => {
      await updateLineItem({ lineId, quantity })
    })
  }

  return (
    <div className="h-full z-50 flex items-center">
      <button
        type="button"
        className="hover:text-umami-ink transition-colors"
        onClick={open}
        data-testid="nav-cart-link"
      >
        Cart ({totalItems})
      </button>

      <Transition show={cartOpen} as={Fragment}>
        <Dialog onClose={close} className="relative z-[90]">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-umami-ink/40 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-8">
                <TransitionChild
                  as={Fragment}
                  enter="transform transition ease-out duration-280"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in duration-200"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <DialogPanel
                    className="pointer-events-auto w-screen max-w-md bg-umami-fog shadow-xl flex flex-col h-full animate-drawer-in"
                    data-testid="nav-cart-dropdown"
                  >
                    <div className="flex items-center justify-between border-b border-umami-ink/10 px-4 py-4">
                      <h3 className="font-display text-xl text-umami-ink">
                        Your order
                      </h3>
                      <button
                        type="button"
                        onClick={close}
                        aria-label="Close cart"
                        data-testid="close-cart-drawer"
                      >
                        <X size="20" />
                      </button>
                    </div>

                    {cartState && cartState.items?.length ? (
                      <>
                        <div className="flex-1 overflow-y-auto px-4 py-4 grid grid-cols-1 gap-y-6 no-scrollbar">
                          {cartState.items
                            .sort((a, b) => {
                              return (a.created_at ?? "") > (b.created_at ?? "")
                                ? -1
                                : 1
                            })
                            .map((item) => (
                              <div
                                className="grid grid-cols-[88px_1fr] gap-x-3"
                                key={item.id}
                                data-testid="cart-item"
                              >
                                <LocalizedClientLink
                                  href={`/products/${item.product_handle}`}
                                  onClick={close}
                                >
                                  <Thumbnail
                                    thumbnail={item.thumbnail}
                                    images={item.variant?.product?.images}
                                    size="square"
                                    className="!rounded-soft !shadow-none"
                                  />
                                </LocalizedClientLink>
                                <div className="flex flex-col gap-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <h3 className="text-sm font-medium text-umami-ink truncate">
                                      <LocalizedClientLink
                                        href={`/products/${item.product_handle}`}
                                        onClick={close}
                                        data-testid="product-link"
                                      >
                                        {item.title}
                                      </LocalizedClientLink>
                                    </h3>
                                    <LineItemPrice
                                      item={item}
                                      style="tight"
                                      currencyCode={cartState.currency_code}
                                    />
                                  </div>
                                  <LineItemOptions
                                    variant={item.variant}
                                    metadata={item.metadata}
                                    data-testid="cart-item-variant"
                                    data-value={item.variant}
                                  />
                                  <div className="flex items-center justify-between mt-1">
                                    <div
                                      className="flex items-center gap-2"
                                      data-testid="cart-item-quantity"
                                      data-value={item.quantity}
                                    >
                                      <button
                                        type="button"
                                        className="h-7 w-7 border border-umami-ink/15 rounded-soft text-sm disabled:opacity-40"
                                        disabled={pending || item.quantity <= 1}
                                        onClick={() =>
                                          changeQty(item.id, item.quantity - 1)
                                        }
                                        aria-label="Decrease"
                                      >
                                        −
                                      </button>
                                      <span className="text-sm w-5 text-center">
                                        {item.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        className="h-7 w-7 border border-umami-ink/15 rounded-soft text-sm"
                                        disabled={pending}
                                        onClick={() =>
                                          changeQty(item.id, item.quantity + 1)
                                        }
                                        aria-label="Increase"
                                      >
                                        +
                                      </button>
                                    </div>
                                    <DeleteButton
                                      id={item.id}
                                      className="text-xs"
                                      data-testid="cart-item-remove-button"
                                    >
                                      Remove
                                    </DeleteButton>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>

                        <div className="border-t border-umami-ink/10 p-4 flex flex-col gap-y-3 text-sm">
                          <div className="flex justify-between text-umami-ink/70">
                            <span>Subtotal</span>
                            <span data-testid="cart-subtotal" data-value={subtotal}>
                              {convertToLocale({
                                amount: subtotal,
                                currency_code: cartState.currency_code,
                              })}
                            </span>
                          </div>
                          {shipping > 0 && (
                            <div className="flex justify-between text-umami-ink/70">
                              <span>Fees</span>
                              <span>
                                {convertToLocale({
                                  amount: shipping,
                                  currency_code: cartState.currency_code,
                                })}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold text-umami-ink text-base">
                            <span>Total</span>
                            <span>
                              {convertToLocale({
                                amount: total,
                                currency_code: cartState.currency_code,
                              })}
                            </span>
                          </div>
                          <LocalizedClientLink href="/checkout" passHref>
                            <Button
                              className="w-full"
                              size="large"
                              onClick={close}
                              data-testid="checkout-button"
                            >
                              Checkout
                            </Button>
                          </LocalizedClientLink>
                          <LocalizedClientLink href="/cart" passHref>
                            <Button
                              className="w-full"
                              size="large"
                              variant="secondary"
                              onClick={close}
                              data-testid="go-to-cart-button"
                            >
                              View full cart
                            </Button>
                          </LocalizedClientLink>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                        <span className="bg-umami-ink text-white text-sm flex items-center justify-center w-8 h-8 rounded-full">
                          0
                        </span>
                        <p className="text-umami-ink/70">Your order is empty.</p>
                        <LocalizedClientLink href="/store" onClick={close}>
                          <Button>Browse menu</Button>
                        </LocalizedClientLink>
                      </div>
                    )}
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}

export default CartDropdown
