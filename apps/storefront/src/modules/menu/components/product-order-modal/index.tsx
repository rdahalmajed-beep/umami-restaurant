"use client"

import { Dialog, Transition } from "@headlessui/react"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"
import type { StoreModifierGroup } from "types/restaurant"
import X from "@modules/common/icons/x"
import Image from "next/image"
import { Fragment, useEffect, useState } from "react"
import { getProductModifiers } from "@lib/data/restaurant"
import Spinner from "@modules/common/icons/spinner"

type Props = {
  product: HttpTypes.StoreProduct | null
  region: HttpTypes.StoreRegion
  isOpen: boolean
  close: () => void
}

export default function ProductOrderModal({
  product,
  region,
  isOpen,
  close,
}: Props) {
  const [modifierGroups, setModifierGroups] = useState<StoreModifierGroup[]>([])
  const [loadingMods, setLoadingMods] = useState(false)

  useEffect(() => {
    if (!product?.id || !isOpen) return
    let cancelled = false
    setLoadingMods(true)
    getProductModifiers(product.id)
      .then((groups) => {
        if (!cancelled) setModifierGroups(groups)
      })
      .finally(() => {
        if (!cancelled) setLoadingMods(false)
      })
    return () => {
      cancelled = true
    }
  }, [product?.id, isOpen])

  const imageUrl = product?.thumbnail || product?.images?.[0]?.url

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={close}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-umami-ink/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end small:items-center justify-center p-0 small:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-250"
              enterFrom="opacity-0 translate-y-8 small:translate-y-0 small:scale-95"
              enterTo="opacity-100 translate-y-0 small:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-6 small:scale-95"
            >
              <Dialog.Panel
                className="w-full small:max-w-lg max-h-[92vh] overflow-y-auto bg-umami-fog shadow-xl small:rounded-large rounded-t-large"
                data-testid="product-order-modal"
              >
                {product && (
                  <>
                    <div className="relative aspect-[16/10] w-full bg-umami-mist">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={product.title || ""}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 512px"
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={close}
                        className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-umami-ink shadow"
                        data-testid="close-product-modal"
                        aria-label="Close"
                      >
                        <X size="18" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-4 p-4 pb-8">
                      <div>
                        <Dialog.Title className="font-display text-2xl text-umami-ink">
                          {product.title}
                        </Dialog.Title>
                        {product.description ? (
                          <p className="mt-2 text-sm text-umami-ink/60">
                            {product.description.replace(/<[^>]+>/g, "")}
                          </p>
                        ) : null}
                      </div>

                      {loadingMods ? (
                        <div className="flex justify-center py-8">
                          <Spinner />
                        </div>
                      ) : (
                        <ProductActions
                          product={product}
                          region={region}
                          modifierGroups={modifierGroups}
                          quantityEnabled
                          addLabel="Add to Order"
                          onAdded={close}
                          hideMobileActions
                        />
                      )}
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
