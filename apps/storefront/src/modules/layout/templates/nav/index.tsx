import { Suspense } from "react"
import Image from "next/image"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { getDictionary, normalizeUiLocale } from "@lib/i18n"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import LanguageSelect from "@modules/layout/components/language-select"
import SideMenu from "@modules/layout/components/side-menu"

/**
 * Slim nav: skip regions/branches/cart metadata waterfall on first paint.
 * Cart button still loads in Suspense.
 */
export default async function Nav() {
  const [locales, currentLocale] = await Promise.all([
    listLocales().catch(() => []),
    getLocale(),
  ])

  const uiLocale = normalizeUiLocale(currentLocale)
  const dict = getDictionary(uiLocale)

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-16 mx-auto border-b border-umami-ink/10 bg-umami-cream/95 backdrop-blur-md">
        <nav className="content-container text-umami-ink/70 flex items-center justify-between w-full h-full text-small-regular">
          <div className="flex-1 basis-0 h-full flex items-center gap-3">
            <div className="h-full">
              <SideMenu
                regions={null}
                locales={locales}
                currentLocale={currentLocale}
              />
            </div>
            <LocalizedClientLink
              href="/store"
              className="hover:text-umami-ink transition-colors font-semibold"
              data-testid="nav-menu-link"
            >
              {dict.nav.menu}
            </LocalizedClientLink>
          </div>

          <LocalizedClientLink
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            data-testid="nav-store-link"
          >
            <Image
              src="/umami-logo.png"
              alt={dict.brand.name}
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
            />
            <span className="font-display text-lg tracking-tight text-umami-ink hidden xsmall:inline">
              {dict.brand.name}
            </span>
          </LocalizedClientLink>

          <div className="flex items-center gap-x-3 h-full flex-1 basis-0 justify-end">
            <LanguageSelect
              locales={locales}
              currentLocale={currentLocale}
              compact
            />
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-umami-ink flex gap-2 umami-tap items-center"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  {dict.nav.cart}
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
