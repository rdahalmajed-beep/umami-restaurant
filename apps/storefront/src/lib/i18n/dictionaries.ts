import type { UiLocale } from "./config"
import { normalizeUiLocale } from "./config"
import ar from "./messages/ar.json"
import en from "./messages/en.json"

export type Dictionary = typeof en

const dictionaries: Record<UiLocale, Dictionary> = {
  ar: ar as Dictionary,
  en,
}

export function getDictionary(
  locale: string | null | undefined
): Dictionary {
  return dictionaries[normalizeUiLocale(locale)]
}

export function t(
  dictionary: Dictionary,
  path: string,
  fallback?: string
): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, dictionary)

  if (typeof value === "string") {
    return value
  }
  return fallback ?? path
}
