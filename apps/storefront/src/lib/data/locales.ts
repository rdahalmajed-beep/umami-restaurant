"use server"

import { sdk } from "@lib/config"
import { UI_LOCALES } from "@lib/i18n"
import { getCacheOptions } from "./cookies"

export type Locale = {
  code: string
  name: string
}

/**
 * Fetches available locales from the backend, always including UI locales (ar/en)
 * so the language switcher works even before Medusa store locales are configured.
 */
export const listLocales = async (): Promise<Locale[]> => {
  const next = {
    ...(await getCacheOptions("locales")),
  }

  const fromApi = await sdk.client
    .fetch<{ locales: Locale[] }>(`/store/locales`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ locales }) => locales)
    .catch(() => null)

  const merged = new Map<string, Locale>()
  for (const locale of UI_LOCALES) {
    merged.set(locale.code.toLowerCase(), locale)
  }
  for (const locale of fromApi ?? []) {
    const key = locale.code.toLowerCase()
    if (!merged.has(key.split(/[-_]/)[0]) && !merged.has(key)) {
      merged.set(key, locale)
    } else {
      // Prefer API display name when codes match UI locale base
      const base = key.split(/[-_]/)[0]
      if (merged.has(base)) {
        merged.set(base, { code: base, name: locale.name || merged.get(base)!.name })
      }
    }
  }

  return Array.from(merged.values())
}
