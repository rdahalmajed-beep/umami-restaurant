export type StoreModifierOption = {
  id: string
  name: string
  price_adjustment: number
  is_default: boolean
  is_active: boolean
  sort_order: number
}

export type StoreModifierGroup = {
  id: string
  name: string
  selection_type: "single" | "multiple"
  is_required: boolean
  min_selections: number
  max_selections: number
  sort_order: number
  options: StoreModifierOption[]
}

export type StoreBranch = {
  id: string
  name: string
  slug: string
  phone?: string | null
  address?: string | null
  is_active: boolean
  accepts_delivery: boolean
  accepts_pickup: boolean
  preparation_minutes: number
}

export type LineItemModifierSnapshot = {
  group_id: string
  group_name: string
  option_id: string
  option_name: string
  price_adjustment: number
}
