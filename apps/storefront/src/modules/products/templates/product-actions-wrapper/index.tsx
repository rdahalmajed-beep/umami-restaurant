import { listProducts } from "@lib/data/products"
import { getProductModifiers } from "@lib/data/restaurant"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real time pricing + modifiers for a product and renders actions.
 */
export default async function ProductActionsWrapper({
  id,
  region,
}: {
  id: string
  region: HttpTypes.StoreRegion
}) {
  const product = await listProducts({
    queryParams: { id: [id] },
    regionId: region.id,
  }).then(({ response }) => response.products[0])

  if (!product) {
    return null
  }

  const modifierGroups = await getProductModifiers(product.id)

  return (
    <ProductActions
      product={product}
      region={region}
      modifierGroups={modifierGroups}
      quantityEnabled
      addLabel="Add to Order"
    />
  )
}
