import { Metadata } from "next"
import Image from "next/image"

import FastUmamiMenu from "@modules/menu/components/fast-umami-menu"
import { getLocale } from "@lib/data/locale-actions"
import { normalizeUiLocale } from "@lib/i18n"

export const metadata: Metadata = {
  title: "القائمة | Menu",
  description: "Umami ramen, sides, and drinks — Manama.",
}

export const dynamic = "force-static"
export const revalidate = 300

export default async function StorePage() {
  const rawLocale = await getLocale()
  const locale = normalizeUiLocale(rawLocale)

  return (
    <div
      className="umami-atmosphere min-h-[calc(100vh-64px)]"
      data-testid="menu-page"
    >
      <div className="content-container pt-6 pb-8">
        <div className="flex items-center gap-3 mb-1">
          <Image
            src="/umami-logo.png"
            alt="Umami"
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
            priority
          />
          <div>
            <h1
              className="font-display text-3xl text-umami-ink"
              data-testid="store-page-title"
            >
              {locale === "ar" ? "القائمة" : "Menu"}
            </h1>
            <p className="text-sm text-umami-ink/60">
              {locale === "ar"
                ? "اختر طبقاً، خصّصه، وأضفه لطلبك"
                : "Pick a dish, customize, add to your order"}
            </p>
          </div>
        </div>
        <FastUmamiMenu locale={locale} />
      </div>
    </div>
  )
}
