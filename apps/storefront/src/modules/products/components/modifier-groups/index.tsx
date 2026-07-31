"use client"

import { convertToLocale } from "@lib/util/money"
import type { StoreModifierGroup } from "types/restaurant"
import { clx } from "@modules/common/components/ui"

type Props = {
  groups: StoreModifierGroup[]
  selected: Record<string, string[]>
  onChange: (groupId: string, optionIds: string[]) => void
  currencyCode: string
  disabled?: boolean
}

export default function ModifierGroups({
  groups,
  selected,
  onChange,
  currencyCode,
  disabled,
}: Props) {
  if (!groups.length) return null

  return (
    <div className="flex flex-col gap-y-5" data-testid="modifier-groups">
      {groups.map((group) => {
        const chosen = selected[group.id] || []
        const isSingle = group.selection_type === "single"

        return (
          <div key={group.id} className="flex flex-col gap-y-2">
            <div className="flex items-baseline justify-between gap-x-2">
              <span className="txt-medium-plus text-ui-fg-base">
                {group.name}
                {group.is_required ? (
                  <span className="text-rose-500 ml-1">*</span>
                ) : null}
              </span>
              <span className="txt-compact-small text-ui-fg-muted">
                {isSingle
                  ? "Choose one"
                  : `Up to ${group.max_selections}`}
              </span>
            </div>

            <div className="flex flex-col gap-y-1">
              {group.options.map((option) => {
                const checked = chosen.includes(option.id)
                const adj = Number(option.price_adjustment) || 0
                const inputId = `${group.id}-${option.id}`

                return (
                  <label
                    key={option.id}
                    htmlFor={inputId}
                    className={clx(
                      "flex items-center justify-between gap-x-3 border border-ui-border-base rounded-rounded px-3 py-2 cursor-pointer",
                      {
                        "border-ui-fg-base bg-ui-bg-subtle": checked,
                        "opacity-50 pointer-events-none": disabled,
                      }
                    )}
                  >
                    <span className="flex items-center gap-x-2">
                      <input
                        id={inputId}
                        type={isSingle ? "radio" : "checkbox"}
                        name={isSingle ? group.id : undefined}
                        checked={checked}
                        disabled={disabled}
                        onChange={() => {
                          if (isSingle) {
                            onChange(group.id, [option.id])
                            return
                          }
                          if (checked) {
                            onChange(
                              group.id,
                              chosen.filter((id) => id !== option.id)
                            )
                            return
                          }
                          if (chosen.length >= group.max_selections) {
                            return
                          }
                          onChange(group.id, [...chosen, option.id])
                        }}
                        className="accent-ui-fg-base"
                      />
                      <span className="txt-medium">{option.name}</span>
                    </span>
                    <span className="txt-compact-small text-ui-fg-subtle">
                      {adj === 0
                        ? "—"
                        : `+${convertToLocale({
                            amount: adj,
                            currency_code: currencyCode,
                          })}`}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function areModifierSelectionsValid(
  groups: StoreModifierGroup[],
  selected: Record<string, string[]>
): boolean {
  for (const group of groups) {
    const count = (selected[group.id] || []).length
    const min = group.is_required
      ? Math.max(group.min_selections, 1)
      : group.min_selections
    if (count < min || count > group.max_selections) {
      return false
    }
  }
  return true
}

export function flattenSelectedOptionIds(
  selected: Record<string, string[]>
): string[] {
  return Object.values(selected).flat()
}

export function defaultModifierSelection(
  groups: StoreModifierGroup[]
): Record<string, string[]> {
  const next: Record<string, string[]> = {}
  for (const group of groups) {
    const defaults = group.options
      .filter((o) => o.is_default)
      .map((o) => o.id)
    if (group.selection_type === "single") {
      next[group.id] = defaults.slice(0, 1)
    } else {
      next[group.id] = defaults.slice(0, group.max_selections)
    }
  }
  return next
}

export function modifiersExtraAmount(
  groups: StoreModifierGroup[],
  selected: Record<string, string[]>
): number {
  let total = 0
  for (const group of groups) {
    const ids = new Set(selected[group.id] || [])
    for (const option of group.options) {
      if (ids.has(option.id)) {
        total += Number(option.price_adjustment) || 0
      }
    }
  }
  return Math.round(total * 1000) / 1000
}
