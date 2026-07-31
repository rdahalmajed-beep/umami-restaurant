"use client"

import { clx } from "@modules/common/components/ui"
import { useEffect, useState } from "react"

type CategoryNavItem = {
  id: string
  name: string
  handle: string
}

export default function StickyCategoryNav({
  categories,
}: {
  categories: CategoryNavItem[]
}) {
  const [active, setActive] = useState(categories[0]?.handle || "")

  useEffect(() => {
    if (!categories.length) return

    const observers: IntersectionObserver[] = []
    categories.forEach((cat) => {
      const el = document.getElementById(cat.handle)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActive(cat.handle)
          }
        },
        { rootMargin: "-30% 0px -55% 0px", threshold: 0 }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [categories])

  if (!categories.length) return null

  return (
    <nav
      className="sticky top-16 z-40 -mx-6 border-b border-umami-ink/10 bg-umami-fog/95 backdrop-blur-md"
      data-testid="sticky-category-nav"
    >
      <div className="content-container">
        <ul className="flex gap-1 overflow-x-auto no-scrollbar py-3">
          {categories.map((cat) => (
            <li key={cat.id} className="shrink-0">
              <a
                href={`#${cat.handle}`}
                onClick={(e) => {
                  e.preventDefault()
                  const el = document.getElementById(cat.handle)
                  el?.scrollIntoView({ behavior: "smooth", block: "start" })
                  setActive(cat.handle)
                }}
                className={clx(
                  "inline-flex rounded-soft px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                  active === cat.handle
                    ? "bg-umami-ink text-white"
                    : "bg-transparent text-umami-ink/70 hover:bg-umami-mist"
                )}
                data-testid={`category-nav-${cat.handle}`}
              >
                {cat.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
