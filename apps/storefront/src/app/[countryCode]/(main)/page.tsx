import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import HomeCategories from "@modules/home/components/home-categories"
import { listCollections } from "@lib/data/collections"
import { listCategories } from "@lib/data/categories"
import { getRegion } from "@lib/data/regions"
import { BRAND_NAME, BRAND_TAGLINE } from "@lib/constants/brand"

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: BRAND_TAGLINE,
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params

  const region = await getRegion(countryCode)

  const [{ collections }, categories] = await Promise.all([
    listCollections({
      fields: "id, handle, title",
    }),
    listCategories({ limit: 20 }),
  ])

  if (!collections || !region) {
    return null
  }

  const topCategories = (categories || []).filter(
    (c) => !c.parent_category && (c.category_children?.length || c.products?.length)
  ).slice(0, 8)

  return (
    <div className="umami-atmosphere min-h-[calc(100vh-64px)]">
      <Hero />
      <HomeCategories categories={topCategories.length ? topCategories : (categories || []).slice(0, 4)} />
      <div className="py-10 content-container">
        <h2 className="font-display text-3xl text-umami-ink mb-6">
          Featured
        </h2>
        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </div>
    </div>
  )
}
