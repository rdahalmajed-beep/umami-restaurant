"use client"

import { HttpTypes } from "@medusajs/types"
import MenuProductCard from "@modules/menu/components/menu-product-card"
import ProductOrderModal from "@modules/menu/components/product-order-modal"
import StickyCategoryNav from "@modules/menu/components/sticky-category-nav"
import { useState } from "react"

export type MenuCategorySection = {
  id: string
  name: string
  handle: string
  products: HttpTypes.StoreProduct[]
}

export default function MenuView({
  sections,
  region,
}: {
  sections: MenuCategorySection[]
  region: HttpTypes.StoreRegion
}) {
  const [selected, setSelected] = useState<HttpTypes.StoreProduct | null>(null)

  const navItems = sections.map((s) => ({
    id: s.id,
    name: s.name,
    handle: s.handle,
  }))

  return (
    <div data-testid="menu-view">
      <StickyCategoryNav categories={navItems} />

      <div className="flex flex-col gap-12 py-8">
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.handle}
            className="scroll-mt-36"
            data-testid={`menu-section-${section.handle}`}
          >
            <h2 className="font-display text-2xl text-umami-ink mb-4">
              {section.name}
            </h2>
            {section.products.length ? (
              <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-3 small:gap-5">
                {section.products.map((product) => (
                  <li key={product.id}>
                    <MenuProductCard
                      product={product}
                      onOpen={setSelected}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-umami-ink/50">No items yet.</p>
            )}
          </section>
        ))}
      </div>

      <ProductOrderModal
        product={selected}
        region={region}
        isOpen={!!selected}
        close={() => setSelected(null)}
      />
    </div>
  )
}
