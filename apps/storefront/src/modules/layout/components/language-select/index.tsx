"use client"

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react"
import { Fragment, useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { StateType } from "@lib/hooks/use-toggle-state"
import { updateLocale } from "@lib/data/locale-actions"
import { Locale } from "@lib/data/locales"
import { useLocale } from "@lib/context/locale-context"
import { normalizeUiLocale } from "@lib/i18n"

type LanguageOption = {
  code: string
  name: string
  localizedName: string
}

type LanguageSelectProps = {
  toggleState?: StateType
  locales: Locale[]
  currentLocale: string | null
  compact?: boolean
}

const getLocalizedLanguageName = (
  code: string,
  fallbackName: string,
  displayLocale: string = "en"
): string => {
  try {
    const displayNames = new Intl.DisplayNames([displayLocale], {
      type: "language",
    })
    return displayNames.of(code) ?? fallbackName
  } catch {
    return fallbackName
  }
}

const LanguageSelect = ({
  toggleState,
  locales,
  currentLocale,
  compact = false,
}: LanguageSelectProps) => {
  const { t, locale: activeUiLocale } = useLocale()
  const [current, setCurrent] = useState<LanguageOption | undefined>(undefined)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const state = toggleState?.state ?? true
  const close = toggleState?.close ?? (() => undefined)

  const options = useMemo(() => {
    return locales.map((locale) => ({
      code: locale.code,
      name: locale.name,
      localizedName: getLocalizedLanguageName(
        locale.code,
        locale.name,
        activeUiLocale
      ),
    }))
  }, [locales, activeUiLocale])

  useEffect(() => {
    const normalized = normalizeUiLocale(currentLocale)
    const option = options.find(
      (o) => normalizeUiLocale(o.code) === normalized
    )
    setCurrent(option ?? options[0])
  }, [options, currentLocale])

  const handleChange = (option: LanguageOption) => {
    startTransition(async () => {
      await updateLocale(normalizeUiLocale(option.code))
      close()
      router.refresh()
    })
  }

  if (!options.length) {
    return null
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-xs" data-testid="nav-language">
        {options.map((o) => {
          const active = normalizeUiLocale(o.code) === activeUiLocale
          return (
            <button
              key={o.code}
              type="button"
              disabled={isPending || active}
              onClick={() => handleChange(o)}
              className={
                active
                  ? "rounded-soft bg-umami-mist px-2 py-1 font-semibold text-umami-ink"
                  : "rounded-soft px-2 py-1 text-umami-ink/60 hover:text-umami-ink"
              }
              aria-pressed={active}
            >
              {normalizeUiLocale(o.code) === "ar" ? "ع" : "EN"}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      <Listbox
        as="span"
        onChange={handleChange}
        value={current}
        disabled={isPending}
      >
        <ListboxButton className="py-1 w-full">
          <div className="txt-compact-small flex items-start gap-x-2">
            <span>{t("nav.language")}:</span>
            {current && (
              <span className="txt-compact-small flex items-center gap-x-2">
                {isPending ? "..." : current.localizedName}
              </span>
            )}
          </div>
        </ListboxButton>
        <div className="flex relative w-full min-w-[240px]">
          <Transition
            show={state}
            as={Fragment}
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions
              className="absolute -bottom-[calc(100%-36px)] start-0 xsmall:start-auto xsmall:end-0 max-h-[442px] overflow-y-scroll z-[900] bg-white drop-shadow-md text-small-regular uppercase text-black no-scrollbar rounded-rounded w-full"
              static
            >
              {options.map((o) => (
                <ListboxOption
                  key={o.code}
                  value={o}
                  className="py-2 hover:bg-gray-200 px-3 cursor-pointer flex items-center gap-x-2"
                >
                  {o.localizedName}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}

export default LanguageSelect
