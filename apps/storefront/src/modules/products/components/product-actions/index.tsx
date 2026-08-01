"use client"

import { addToCart, addToCartWithModifiers } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import ModifierGroups, {
  areModifierSelectionsValid,
  defaultModifierSelection,
  flattenSelectedOptionIds,
  modifiersExtraAmount,
} from "@modules/products/components/modifier-groups"
import type { StoreModifierGroup } from "types/restaurant"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"
import { useLocale } from "@lib/context/locale-context"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
  modifierGroups?: StoreModifierGroup[]
  quantityEnabled?: boolean
  addLabel?: string
  onAdded?: () => void
  hideMobileActions?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  region,
  disabled,
  modifierGroups = [],
  quantityEnabled = false,
  addLabel,
  onAdded,
  hideMobileActions = false,
}: ProductActionsProps) {
  const { t } = useLocale()
  const resolvedAddLabel = addLabel ?? t("product.addToCart")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [modifierSelected, setModifierSelected] = useState<
    Record<string, string[]>
  >(() => defaultModifierSelection(modifierGroups))
  const [note, setNote] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const countryCode = useParams().countryCode as string

  useEffect(() => {
    setModifierSelected(defaultModifierSelection(modifierGroups))
  }, [modifierGroups])

  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    if (hideMobileActions) return
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant, hideMobileActions])

  const inStock = useMemo(() => {
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }
    if (selectedVariant?.allow_backorder) {
      return true
    }
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }
    return false
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)
  const inView = useIntersection(actionsRef, "0px")

  const modifiersValid = areModifierSelectionsValid(
    modifierGroups,
    modifierSelected
  )
  const modifierExtra = modifiersExtraAmount(modifierGroups, modifierSelected)
  const currencyCode = region.currency_code || "bhd"
  const baseAmount =
    (selectedVariant as { calculated_price?: { calculated_amount?: number } })
      ?.calculated_price?.calculated_amount ?? 0
  const unitTotal = Math.round((baseAmount + modifierExtra) * 1000) / 1000
  const displayTotal = Math.round(unitTotal * quantity * 1000) / 1000

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null
    if (modifierGroups.length && !modifiersValid) {
      setError("Please complete required modifiers")
      return
    }

    setIsAdding(true)
    setError(null)

    try {
      if (modifierGroups.length) {
        await addToCartWithModifiers({
          variantId: selectedVariant.id,
          quantity,
          countryCode,
          optionIds: flattenSelectedOptionIds(modifierSelected),
          note: note.trim() || undefined,
        })
      } else {
        await addToCart({
          variantId: selectedVariant.id,
          quantity,
          countryCode,
        })
      }
      onAdded?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to cart")
    }

    setIsAdding(false)
  }

  const buttonLabel = !selectedVariant
    ? t("product.selectVariant")
    : !inStock || !isValidVariant
    ? t("product.outOfStock")
    : resolvedAddLabel

  return (
    <>
      <div className="flex flex-col gap-y-2" ref={actionsRef}>
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        {modifierGroups.length > 0 && (
          <>
            <ModifierGroups
              groups={modifierGroups}
              selected={modifierSelected}
              onChange={(groupId, optionIds) =>
                setModifierSelected((prev) => ({ ...prev, [groupId]: optionIds }))
              }
              currencyCode={currencyCode}
              disabled={!!disabled || isAdding}
            />
            <div className="flex flex-col gap-y-1">
              <label
                htmlFor="item-note"
                className="txt-medium text-ui-fg-subtle"
              >
                {t("product.note")}
              </label>
              <textarea
                id="item-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={!!disabled || isAdding}
                placeholder={t("product.notePlaceholder")}
                maxLength={500}
                rows={2}
                className="w-full border border-ui-border-base rounded-rounded px-3 py-2 txt-medium"
                data-testid="item-note"
              />
            </div>
            <Divider />
          </>
        )}

        {quantityEnabled && (
          <div className="flex items-center justify-between gap-3 py-1">
            <span className="txt-medium text-ui-fg-subtle">Quantity</span>
            <div
              className="flex items-center gap-2"
              data-testid="quantity-controls"
            >
              <button
                type="button"
                className="h-8 w-8 rounded-soft border border-umami-ink/20 text-umami-ink disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || !!disabled || isAdding}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center font-semibold" data-testid="quantity-value">
                {quantity}
              </span>
              <button
                type="button"
                className="h-8 w-8 rounded-soft border border-umami-ink/20 text-umami-ink"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                disabled={!!disabled || isAdding}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
        )}

        {modifierGroups.length > 0 && selectedVariant ? (
          <div className="flex flex-col text-ui-fg-base">
            <span className="text-xl-semi" data-testid="product-price">
              {convertToLocale({
                amount: displayTotal,
                currency_code: currencyCode,
              })}
            </span>
            {modifierExtra > 0 && (
              <span className="txt-compact-small text-ui-fg-subtle">
                Includes +
                {convertToLocale({
                  amount: modifierExtra * quantity,
                  currency_code: currencyCode,
                })}{" "}
                modifiers
              </span>
            )}
          </div>
        ) : (
          <ProductPrice product={product} variant={selectedVariant} />
        )}

        {error && (
          <p className="text-rose-500 txt-compact-small" role="alert">
            {error}
          </p>
        )}

        <Button
          onClick={handleAddToCart}
          disabled={
            !inStock ||
            !selectedVariant ||
            !!disabled ||
            isAdding ||
            !isValidVariant ||
            (modifierGroups.length > 0 && !modifiersValid)
          }
          variant="primary"
          className="w-full h-10"
          isLoading={isAdding}
          data-testid="add-product-button"
        >
          {buttonLabel}
        </Button>
        {!hideMobileActions && (
          <MobileActions
            product={product}
            variant={selectedVariant}
            options={options}
            updateOptions={setOptionValue}
            inStock={inStock}
            handleAddToCart={handleAddToCart}
            isAdding={isAdding}
            show={!inView}
            optionsDisabled={!!disabled || isAdding}
          />
        )}
      </div>
    </>
  )
}
