import { getBaseURL } from "@lib/util/env"
import { getLocale } from "@lib/data/locale-actions"
import {
  getDictionary,
  getHtmlDir,
  getHtmlLang,
  normalizeUiLocale,
} from "@lib/i18n"
import { LocaleProvider } from "@lib/context/locale-context"
import { Metadata } from "next"
import "styles/globals.css"

/**
 * Build-time fonts are local/system stacks so `next build` does not require
 * downloading Google Fonts (Phase 0 QG-001).
 */
export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: "Umami",
    template: "%s | Umami",
  },
  description: "Order from Umami — Japanese ramen & sides in Manama.",
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const rawLocale = await getLocale()
  const locale = normalizeUiLocale(rawLocale)
  const dir = getHtmlDir(locale)
  const lang = getHtmlLang(locale)
  const dictionary = getDictionary(locale)

  return (
    <html lang={lang} dir={dir} data-mode="light">
      <body className="font-sans antialiased">
        <LocaleProvider locale={locale} dir={dir} dictionary={dictionary}>
          <main className="relative">{props.children}</main>
        </LocaleProvider>
      </body>
    </html>
  )
}
