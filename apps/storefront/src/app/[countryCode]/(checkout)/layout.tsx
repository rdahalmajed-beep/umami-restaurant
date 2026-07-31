import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import { BRAND_NAME } from "@lib/constants/brand"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full bg-umami-fog relative small:min-h-screen">
      <div className="h-16 bg-umami-fog/95 border-b border-umami-ink/10 backdrop-blur-md">
        <nav className="flex h-full items-center content-container justify-between">
          <LocalizedClientLink
            href="/cart"
            className="text-small-semi text-umami-ink flex items-center gap-x-2 flex-1 basis-0"
            data-testid="back-to-cart-link"
          >
            <ChevronDown className="rotate-90" size={16} />
            <span className="mt-px hidden small:block txt-compact-plus text-umami-ink/60 hover:text-umami-ink">
              Back to cart
            </span>
            <span className="mt-px block small:hidden txt-compact-plus text-umami-ink/60 hover:text-umami-ink">
              Back
            </span>
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/"
            className="font-display text-xl text-umami-ink hover:opacity-80"
            data-testid="store-link"
          >
            {BRAND_NAME}
          </LocalizedClientLink>
          <div className="flex-1 basis-0" />
        </nav>
      </div>
      <div className="relative" data-testid="checkout-container">{children}</div>
    </div>
  )
}
