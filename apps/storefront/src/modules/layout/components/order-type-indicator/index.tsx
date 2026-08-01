"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { StoreBranch } from "types/restaurant"
import { useLocale } from "@lib/context/locale-context"

type RestaurantMeta = {
  order_type?: "delivery" | "pickup"
  branch_id?: string
}

export default function OrderTypeIndicator({
  orderType,
  branchId,
  branches,
}: {
  orderType?: "delivery" | "pickup" | null
  branchId?: string | null
  branches: StoreBranch[]
}) {
  const { t } = useLocale()

  if (!orderType) {
    return (
      <LocalizedClientLink
        href="/cart"
        className="hidden xsmall:inline-flex items-center text-xs text-umami-leaf hover:text-umami-ink transition-colors"
        data-testid="nav-order-type"
      >
        {t("orderType.set")}
      </LocalizedClientLink>
    )
  }

  const branch = branches.find((b) => b.id === branchId)
  const type =
    orderType === "pickup" ? t("orderType.pickup") : t("orderType.delivery")
  const label = branch ? `${type} · ${branch.name}` : type

  return (
    <LocalizedClientLink
      href="/cart"
      className="hidden xsmall:inline-flex max-w-[160px] truncate items-center rounded-soft bg-umami-mist px-2 py-1 text-xs text-umami-ink hover:bg-umami-mist/80 transition-colors"
      data-testid="nav-order-type"
      title={label}
    >
      {label}
    </LocalizedClientLink>
  )
}

export type { RestaurantMeta }
