import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { retrieveCart } from "@lib/data/cart"
import { listActiveBranches } from "@lib/data/restaurant"
import { BRAND_NAME } from "@lib/constants/brand"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import OrderTypeIndicator from "@modules/layout/components/order-type-indicator"
import SideMenu from "@modules/layout/components/side-menu"

export default async function Nav() {
  const [regions, locales, currentLocale, cart, branches] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
    retrieveCart().catch(() => null),
    listActiveBranches().catch(() => []),
  ])

  const restaurant = (cart?.metadata?.restaurant || {}) as {
    order_type?: "delivery" | "pickup"
    branch_id?: string
  }

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-16 mx-auto border-b border-umami-ink/10 bg-umami-fog/90 backdrop-blur-md duration-200">
        <nav className="content-container txt-xsmall-plus text-umami-ink/70 flex items-center justify-between w-full h-full text-small-regular">
          <div className="flex-1 basis-0 h-full flex items-center gap-4">
            <div className="h-full">
              <SideMenu
                regions={regions}
                locales={locales}
                currentLocale={currentLocale}
              />
            </div>
            <LocalizedClientLink
              href="/store"
              className="hover:text-umami-ink transition-colors"
              data-testid="nav-menu-link"
            >
              Menu
            </LocalizedClientLink>
          </div>

          <div className="flex items-center h-full">
            <LocalizedClientLink
              href="/"
              className="font-display text-xl tracking-tight text-umami-ink hover:opacity-80 transition-opacity"
              data-testid="nav-store-link"
            >
              {BRAND_NAME}
            </LocalizedClientLink>
          </div>

          <div className="flex items-center gap-x-3 small:gap-x-5 h-full flex-1 basis-0 justify-end">
            <OrderTypeIndicator
              orderType={restaurant.order_type}
              branchId={restaurant.branch_id}
              branches={branches}
            />
            <div className="hidden small:flex items-center h-full">
              <LocalizedClientLink
                className="hover:text-umami-ink transition-colors"
                href="/account"
                data-testid="nav-account-link"
              >
                Account
              </LocalizedClientLink>
            </div>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-umami-ink flex gap-2"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Cart (0)
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
