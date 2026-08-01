export const DEFAULT_LOCALE = "ar" as const

export type UiLocale = "ar" | "en"

export const UI_LOCALES: { code: UiLocale; name: string }[] = [
  { code: "ar", name: "Arabic" },
  { code: "en", name: "English" },
]

export function normalizeUiLocale(code: string | null | undefined): UiLocale {
  if (!code) {
    return DEFAULT_LOCALE
  }
  const base = code.toLowerCase().split(/[-_]/)[0]
  if (base === "en") {
    return "en"
  }
  if (base === "ar") {
    return "ar"
  }
  return DEFAULT_LOCALE
}

export function isRtl(locale: string | null | undefined): boolean {
  return normalizeUiLocale(locale) === "ar"
}

export function getHtmlLang(locale: string | null | undefined): string {
  return normalizeUiLocale(locale)
}

export function getHtmlDir(locale: string | null | undefined): "rtl" | "ltr" {
  return isRtl(locale) ? "rtl" : "ltr"
}
