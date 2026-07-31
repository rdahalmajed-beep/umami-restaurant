import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { BRAND_NAME, BRAND_TAGLINE } from "@lib/constants/brand"

const Hero = () => {
  return (
    <section
      className="relative w-full min-h-[78vh] overflow-hidden"
      data-testid="home-hero"
    >
      <div
        aria-hidden
        className="absolute inset-0 umami-hero-media animate-umami-pan origin-center"
      />
      <div className="relative z-10 content-container flex min-h-[78vh] flex-col justify-end pb-14 pt-28 small:pb-20">
        <p className="font-display text-5xl small:text-7xl text-white tracking-tight animate-umami-rise">
          {BRAND_NAME}
        </p>
        <p className="mt-3 max-w-md text-base small:text-lg text-white/85 animate-umami-rise [animation-delay:120ms]">
          {BRAND_TAGLINE}
        </p>
        <div className="mt-8 animate-umami-rise [animation-delay:220ms]">
          <LocalizedClientLink
            href="/store"
            className="inline-flex items-center justify-center rounded-soft bg-umami-saffron px-6 py-3 text-sm font-semibold text-umami-ink transition-transform hover:scale-[1.02] active:scale-[0.98]"
            data-testid="hero-view-menu"
          >
            View Menu
          </LocalizedClientLink>
        </div>
      </div>
    </section>
  )
}

export default Hero
