import { Metadata } from "next"
import Image from "next/image"

import Hero from "@modules/home/components/hero"
import FastUmamiMenu from "@modules/menu/components/fast-umami-menu"
import { getLocale } from "@lib/data/locale-actions"
import { BRAND_NAME, BRAND_TAGLINE } from "@lib/constants/brand"
import { normalizeUiLocale } from "@lib/i18n"

export const dynamic = "force-static"
export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: BRAND_NAME,
    description: BRAND_TAGLINE,
  }
}

/**
 * Fast home: logo hero + local Umami catalog (no Medusa waterfall).
 * Backend products sync via seed when Admin is linked on Vercel.
 */
export default async function Home() {
  const rawLocale = await getLocale()
  const locale = normalizeUiLocale(rawLocale)

  return (
    <div className="umami-atmosphere min-h-[calc(100vh-64px)]">
      <Hero />
      <div className="content-container pb-8">
        <div className="flex items-center gap-3 mb-2">
          <Image
            src="/umami-logo.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
          <div>
            <h2 className="font-display text-2xl text-umami-ink">
              {locale === "ar" ? "القائمة" : "Menu"}
            </h2>
            <p className="text-sm text-umami-ink/60">
              {locale === "ar"
                ? "أسعار بالدينار البحريني · اضغط للإضافة"
                : "Prices in BHD · tap to customize"}
            </p>
          </div>
        </div>
        <FastUmamiMenu locale={locale} />
      </div>
    </div>
  )
}
