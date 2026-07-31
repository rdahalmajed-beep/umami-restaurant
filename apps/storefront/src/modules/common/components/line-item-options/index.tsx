import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"
import type { LineItemModifierSnapshot } from "types/restaurant"

type LineItemOptionsProps = {
  variant: HttpTypes.StoreProductVariant | undefined
  metadata?: Record<string, unknown> | null
  "data-testid"?: string
  "data-value"?: HttpTypes.StoreProductVariant
}

const LineItemOptions = ({
  variant,
  metadata,
  "data-testid": dataTestid,
  "data-value": dataValue,
}: LineItemOptionsProps) => {
  const modifiers = (metadata?.restaurant_modifiers ||
    []) as LineItemModifierSnapshot[]
  const note = metadata?.restaurant_note as string | undefined

  return (
    <div className="flex flex-col gap-y-0.5 w-full">
      <Text
        data-testid={dataTestid}
        data-value={dataValue}
        className="inline-block txt-medium text-ui-fg-subtle w-full overflow-hidden text-ellipsis"
      >
        Variant: {variant?.title}
      </Text>
      {modifiers.map((m) => (
        <Text
          key={`${m.group_id}-${m.option_id}`}
          className="txt-compact-small text-ui-fg-muted"
          data-testid="line-item-modifier"
        >
          {m.group_name}: {m.option_name}
          {Number(m.price_adjustment) > 0
            ? ` (+${Number(m.price_adjustment).toFixed(3)})`
            : ""}
        </Text>
      ))}
      {note ? (
        <Text
          className="txt-compact-small text-ui-fg-muted italic"
          data-testid="line-item-note"
        >
          Note: {note}
        </Text>
      ) : null}
    </div>
  )
}

export default LineItemOptions
