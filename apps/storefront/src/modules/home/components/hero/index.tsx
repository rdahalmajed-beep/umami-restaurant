"use client"

import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useLocale } from "@lib/context/locale-context"
import type { StoreBrandContent } from "types/restaurant"

const Hero = ({ content }: { content?: StoreBrandContent | null }) => {
  const { t, locale } = useLocale()
  const isAr = locale.startsWith("ar")
  const brand = content?.brand_name || t("brand.name")
  const subtitle =
    content?.hero?.subtitle ||
    (isAr
      ? "رامن وأطباق يابانية في المنامة"
      : "Japanese ramen & sides in Manama")
  const cta = content?.hero?.cta_label || t("hero.viewMenu")
  const href = content?.hero?.cta_href || "/store"

  return (
    <section
      className="relative w-full overflow-hidden"
      data-testid="home-hero"
    >
      <div aria-hidden className="absolute inset-0 umami-hero-media" />
      <div className="relative z-10 content-container flex min-h-[52vh] flex-col items-center justify-center py-12 text-center">
        <Image
          src="/umami-logo.png"
          alt={brand}
          width={220}
          height={220}
          priority
          className="h-36 w-36 small:h-44 small:w-44 object-contain animate-umami-rise drop-shadow-sm"
        />
        <h1 className="mt-5 font-display text-4xl small:text-5xl text-umami-ink tracking-tight animate-umami-rise [animation-delay:80ms]">
          {brand}
        </h1>
        <p className="mt-2 max-w-sm text-base text-umami-ink/70 animate-umami-rise [animation-delay:140ms]">
          {subtitle}
        </p>
        <div className="mt-7 animate-umami-rise [animation-delay:200ms]">
          <LocalizedClientLink
            href={href.startsWith("/") ? href : "/store"}
            className="umami-btn-accent"
            data-testid="hero-view-menu"
          >
            {cta}
          </LocalizedClientLink>
        </div>
      </div>
    </section>
  )
}

export default Hero
