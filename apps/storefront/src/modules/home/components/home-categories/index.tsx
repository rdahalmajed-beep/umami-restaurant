import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function HomeCategories({
  categories,
}: {
  categories: HttpTypes.StoreProductCategory[]
}) {
  if (!categories.length) return null

  return (
    <section className="content-container py-14" data-testid="home-categories">
      <h2 className="font-display text-3xl text-umami-ink">Categories</h2>
      <p className="mt-2 text-umami-ink/60 text-sm max-w-md">
        Jump straight into the dishes you are craving.
      </p>
      <ul className="mt-8 grid grid-cols-2 small:grid-cols-4 gap-3">
        {categories.map((cat, i) => (
          <li key={cat.id}>
            <LocalizedClientLink
              href={`/store#${cat.handle}`}
              className="group block border border-umami-ink/10 bg-white/70 px-4 py-5 transition-all hover:-translate-y-0.5 hover:border-umami-leaf/40 hover:bg-white"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="font-display text-lg text-umami-ink group-hover:text-umami-leaf transition-colors">
                {cat.name}
              </span>
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
