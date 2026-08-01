"use client"

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import type { Dictionary } from "@lib/i18n"
import { t as translate, type UiLocale } from "@lib/i18n"

type LocaleContextValue = {
  locale: UiLocale
  dir: "rtl" | "ltr"
  dictionary: Dictionary
  t: (path: string, fallback?: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
  locale,
  dir,
  dictionary,
  children,
}: {
  locale: UiLocale
  dir: "rtl" | "ltr"
  dictionary: Dictionary
  children: ReactNode
}) {
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir,
      dictionary,
      t: (path, fallback) => translate(dictionary, path, fallback),
    }),
    [locale, dir, dictionary]
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider")
  }
  return ctx
}
