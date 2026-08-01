"use client"

import { setCartRestaurantMeta } from "@lib/data/cart"
import type { StoreBranch } from "types/restaurant"
import { clx } from "@modules/common/components/ui"
import { useEffect, useRef, useState, useTransition } from "react"

type Props = {
  branches: StoreBranch[]
  initialOrderType?: "delivery" | "pickup"
  initialBranchId?: string
}

export default function OrderTypeSelector({
  branches,
  initialOrderType,
  initialBranchId,
}: Props) {
  const [orderType, setOrderType] = useState<"delivery" | "pickup">(
    initialOrderType || "pickup"
  )
  const [branchId, setBranchId] = useState(
    initialBranchId || branches[0]?.id || ""
  )
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const didAutoSave = useRef(false)

  useEffect(() => {
    if (!branchId && branches[0]?.id) {
      setBranchId(branches[0].id)
    }
  }, [branches, branchId])

  const save = (nextType: "delivery" | "pickup", nextBranch: string) => {
    if (!nextBranch) {
      setError("Select a branch")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await setCartRestaurantMeta({
          orderType: nextType,
          branchId: nextBranch,
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save")
      }
    })
  }

  // Persist defaults once so checkout can complete even if the user never clicks.
  useEffect(() => {
    if (didAutoSave.current) return
    const nextBranch = branchId || branches[0]?.id
    if (!nextBranch) return
    didAutoSave.current = true
    if (!initialOrderType || !initialBranchId) {
      save(orderType, nextBranch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once hydrate
  }, [branchId, branches, initialOrderType, initialBranchId, orderType])

  if (!branches.length) {
    return null
  }

  return (
    <div
      className="flex flex-col gap-y-3 bg-white py-4"
      data-testid="order-type-selector"
    >
      <h2 className="txt-medium-plus">How would you like your order?</h2>
      <div className="flex gap-x-2">
        {(["delivery", "pickup"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setOrderType(type)
              save(type, branchId)
            }}
            className={clx(
              "flex-1 border rounded-rounded px-3 py-2 txt-medium capitalize transition-colors",
              orderType === type
                ? "border-umami-ink bg-umami-mist"
                : "border-ui-border-base hover:border-umami-ink/40"
            )}
            data-testid={`order-type-${type}`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-y-1">
        <label className="txt-compact-small text-ui-fg-subtle">
          Select Branch
        </label>
        <select
          className="border border-ui-border-base rounded-rounded px-3 py-2"
          value={branchId}
          onChange={(e) => {
            setBranchId(e.target.value)
            save(orderType, e.target.value)
          }}
          data-testid="branch-select"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <p className="txt-compact-small text-umami-ink/50" aria-live="polite">
        {pending ? "Saving…" : saved ? "Saved" : "Changes save automatically"}
      </p>
      {error && <p className="text-rose-500 txt-compact-small">{error}</p>}
    </div>
  )
}
