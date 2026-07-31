"use client"

import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import Thumbnail from "@modules/products/components/thumbnail"
import { clx } from "@modules/common/components/ui"

function isProductAvailable(product: HttpTypes.StoreProduct) {
  const variants = product.variants || []
  if (!variants.length) return false
  return variants.some((v) => {
    if (!v.manage_inventory) return true
    if (v.allow_backorder) return true
    return (v.inventory_quantity || 0) > 0
  })
}

export default function MenuProductCard({
  product,
  onOpen,
}: {
  product: HttpTypes.StoreProduct
  onOpen: (product: HttpTypes.StoreProduct) => void
}) {
  const { cheapestPrice } = getProductPrice({ product })
  const available = isProductAvailable(product)
  const shortDesc =
    product.description?.replace(/<[^>]+>/g, "").slice(0, 90) || ""

  return (
    <article
      className={clx(
        "flex flex-col overflow-hidden border border-umami-ink/10 bg-white/80 transition-shadow",
        available ? "hover:shadow-md cursor-pointer" : "opacity-60"
      )}
      data-testid="menu-product-card"
    >
      <button
        type="button"
        className="text-left flex flex-col h-full"
        onClick={() => available && onOpen(product)}
        disabled={!available}
        data-testid="menu-product-open"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-umami-mist">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            className="!rounded-none"
          />
          {!available && (
            <span
              className="absolute inset-x-0 bottom-0 bg-umami-ink/80 px-3 py-1.5 text-center text-xs text-white"
              data-testid="product-unavailable"
            >
              Unavailable
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3
            className="font-display text-base text-umami-ink leading-snug"
            data-testid="product-title"
          >
            {product.title}
          </h3>
          {shortDesc ? (
            <p className="text-xs text-umami-ink/55 line-clamp-2">
              {shortDesc}
              {product.description && product.description.length > 90
                ? "…"
                : ""}
            </p>
          ) : null}
          <div className="mt-auto pt-2 flex items-center justify-between gap-2">
            {cheapestPrice ? (
              <span
                className="text-sm font-semibold text-umami-leaf"
                data-testid="price"
              >
                From {cheapestPrice.calculated_price}
              </span>
            ) : (
              <span className="text-sm text-umami-ink/40">—</span>
            )}
            {available && (
              <span className="text-xs font-medium text-umami-ink/70 underline-offset-2 group-hover:underline">
                Add
              </span>
            )}
          </div>
        </div>
      </button>
    </article>
  )
}
