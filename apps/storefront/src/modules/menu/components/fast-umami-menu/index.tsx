"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import {
  UMAMI_MODIFIERS,
  UMAMI_PRODUCTS,
  UMAMI_SECTIONS,
  formatBhd,
  type CatalogProduct,
} from "@lib/catalog/umami-menu"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { clx } from "@modules/common/components/ui"

type CartLine = {
  handle: string
  name: string
  price: number
  qty: number
  notes?: string
}

const CART_KEY = "umami_fast_cart_v1"

/**
 * Fast mobile-first Umami menu — local catalog, no Medusa round-trips for browse.
 * Checkout still uses Medusa when backend is configured.
 */
export default function FastUmamiMenu({ locale = "ar" }: { locale?: string }) {
  const isAr = locale.startsWith("ar")
  const [active, setActive] = useState<string>("mains")
  const [cart, setCart] = useState<CartLine[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [open, setOpen] = useState<CatalogProduct | null>(null)
  const [mods, setMods] = useState<string[]>([])
  const [flavor, setFlavor] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CART_KEY)
      if (raw) setCart(JSON.parse(raw) as CartLine[])
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(CART_KEY, JSON.stringify(cart))
    } catch {
      // ignore
    }
  }, [cart, hydrated])

  const items = useMemo(
    () => UMAMI_PRODUCTS.filter((p) => p.section === active),
    [active]
  )

  const total = cart.reduce((s, l) => s + l.price * l.qty, 0)
  const count = cart.reduce((s, l) => s + l.qty, 0)

  const addOpen = () => {
    if (!open) return
    const modExtra = UMAMI_MODIFIERS.filter((m) => mods.includes(m.id)).reduce(
      (s, m) => s + m.price,
      0
    )
    const name = isAr ? open.name_ar : open.name_en
    const noteParts = [
      ...UMAMI_MODIFIERS.filter((m) => mods.includes(m.id)).map((m) =>
        isAr ? m.name_ar : m.name_en
      ),
      flavor || undefined,
    ].filter(Boolean)
    startTransition(() => {
      setCart((prev) => {
        const key = `${open.handle}:${noteParts.join(",")}`
        const existing = prev.find(
          (l) => `${l.handle}:${l.notes || ""}` === key
        )
        if (existing) {
          return prev.map((l) =>
            l === existing ? { ...l, qty: l.qty + 1 } : l
          )
        }
        return [
          ...prev,
          {
            handle: open.handle,
            name,
            price: open.price + modExtra,
            qty: 1,
            notes: noteParts.join(" · ") || undefined,
          },
        ]
      })
      setOpen(null)
      setMods([])
      setFlavor(null)
    })
  }

  return (
    <div className="pb-28" data-testid="fast-umami-menu">
      <div className="sticky top-16 z-40 -mx-4 px-4 py-2 bg-umami-cream/95 backdrop-blur border-b border-umami-ink/10">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {UMAMI_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={clx(
                "umami-tap shrink-0 rounded-full px-4 py-2 text-sm font-semibold border",
                active === s.id
                  ? "bg-umami-ink text-white border-umami-ink"
                  : "bg-white/70 text-umami-ink border-umami-ink/15"
              )}
              onClick={() => setActive(s.id)}
            >
              {s.emoji} {isAr ? s.name_ar : s.name_en}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex flex-col gap-3 pt-4">
        {items.map((p) => (
          <li key={p.handle}>
            <button
              type="button"
              className="w-full text-start rounded-2xl border border-umami-ink/10 bg-white/80 p-4 umami-tap active:bg-umami-mist"
              onClick={() => {
                setOpen(p)
                setMods([])
                setFlavor(p.flavors?.[0] || null)
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg text-umami-ink leading-snug">
                    {isAr ? p.name_ar : p.name_en}
                  </h3>
                  <p className="mt-1 text-sm text-umami-ink/60 line-clamp-2">
                    {isAr ? p.description_ar : p.description_en}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-umami-saffron/25 px-3 py-1 text-sm font-semibold text-umami-ink">
                  {formatBhd(p.price)}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {count > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-umami-cream via-umami-cream to-transparent">
          <div className="content-container">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-umami-ink text-white px-4 py-3 shadow-lg">
              <div>
                <p className="text-xs text-white/70">
                  {isAr ? "السلة" : "Cart"} · {count}
                </p>
                <p className="font-semibold">{formatBhd(total)}</p>
              </div>
              <LocalizedClientLink href="/cart" className="umami-btn-accent text-umami-ink">
                {isAr ? "متابعة" : "Checkout"}
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end bg-umami-ink/40"
          onClick={() => setOpen(null)}
        >
          <div
            className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-umami-cream p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-umami-ink/20" />
            <h2 className="font-display text-2xl text-umami-ink">
              {isAr ? open.name_ar : open.name_en}
            </h2>
            <p className="mt-1 text-sm text-umami-ink/65">
              {isAr ? open.description_ar : open.description_en}
            </p>
            <p className="mt-2 font-semibold text-umami-ink">
              {formatBhd(open.price)}
            </p>

            {open.flavors?.length ? (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2">
                  {isAr ? "النكهة" : "Flavor"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {open.flavors.map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={clx(
                        "rounded-full px-3 py-2 text-sm border umami-tap",
                        flavor === f
                          ? "bg-umami-ink text-white border-umami-ink"
                          : "bg-white border-umami-ink/15"
                      )}
                      onClick={() => setFlavor(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {open.section !== "drinks" ? (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2">
                  {isAr ? "الإضافات" : "Extras"}
                </p>
                <ul className="flex flex-col gap-2">
                  {UMAMI_MODIFIERS.filter((m) =>
                    open.handle.includes("karaage")
                      ? true
                      : m.id !== "peri-peri"
                  ).map((m) => {
                    const on = mods.includes(m.id)
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          className={clx(
                            "w-full flex items-center justify-between rounded-xl border px-3 py-3 text-sm umami-tap",
                            on
                              ? "border-umami-saffron bg-umami-saffron/20"
                              : "border-umami-ink/10 bg-white/80"
                          )}
                          onClick={() =>
                            setMods((prev) =>
                              on
                                ? prev.filter((x) => x !== m.id)
                                : [...prev, m.id]
                            )
                          }
                        >
                          <span>{isAr ? m.name_ar : m.name_en}</span>
                          <span>+{formatBhd(m.price)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}

            <button
              type="button"
              disabled={pending}
              className="umami-btn-primary w-full mt-6"
              onClick={addOpen}
            >
              {isAr ? "أضف للطلب" : "Add to order"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
