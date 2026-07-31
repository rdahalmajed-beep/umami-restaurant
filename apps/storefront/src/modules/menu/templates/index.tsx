import { listCategories } from "@lib/data/categories"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import MenuView, {
  MenuCategorySection,
} from "@modules/menu/components/menu-view"
import { HttpTypes } from "@medusajs/types"

export default async function MenuTemplate({
  countryCode,
}: {
  countryCode: string
}) {
  const region = await getRegion(countryCode)
  if (!region) return null

  const [categories, productResult] = await Promise.all([
    listCategories({ limit: 50 }),
    listProducts({
      countryCode,
      queryParams: {
        limit: 100,
        fields:
          "*variants.calculated_price,+variants.inventory_quantity,*variants.options,*images,+thumbnail,+description,+metadata",
      },
    }),
  ])

  const pricedById = new Map(
    productResult.response.products.map((p) => [p.id, p])
  )

  const topLevel = (categories || []).filter((c) => !c.parent_category)

  const sections: MenuCategorySection[] = topLevel
    .map((cat) => {
      const fromCategory = (cat.products || [])
        .map((p) => pricedById.get(p.id!))
        .filter(Boolean) as HttpTypes.StoreProduct[]

      // Fallback: match by category_id if relation products are empty
      const products =
        fromCategory.length > 0
          ? fromCategory
          : productResult.response.products.filter((p) =>
              (p.categories || []).some((c) => c.id === cat.id)
            )

      return {
        id: cat.id,
        name: cat.name,
        handle: cat.handle,
        products,
      }
    })
    .filter((s) => s.products.length > 0)

  // If categories have no products linked, show a flat "All" section
  const finalSections =
    sections.length > 0
      ? sections
      : [
          {
            id: "all",
            name: "Menu",
            handle: "menu",
            products: productResult.response.products,
          },
        ]

  return (
    <div
      className="umami-atmosphere min-h-[calc(100vh-64px)]"
      data-testid="menu-page"
    >
      <div className="content-container pt-8 pb-16">
        <h1
          className="font-display text-4xl text-umami-ink mb-2"
          data-testid="store-page-title"
        >
          Menu
        </h1>
        <p className="text-sm text-umami-ink/60 mb-2 max-w-lg">
          Browse by category, customize your plate, and add it to your order.
        </p>
        <MenuView sections={finalSections} region={region} />
      </div>
    </div>
  )
}
