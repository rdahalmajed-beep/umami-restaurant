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
  variant_ids?: string[] | null
  branch_ids?: string[] | null
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

export type StoreFulfillmentPolicy = {
  id?: string
  branch_id?: string
  order_type: "delivery" | "pickup" | string
  min_order_amount: number
  flat_fee?: number | null
  free_threshold?: number | null
  estimated_minutes: number
  lead_time_minutes?: number
  is_paused: boolean
}

export type StoreBrandContent = {
  brand_name?: string
  logo_url?: string | null
  hero?: {
    title?: string
    subtitle?: string
    media_url?: string | null
    cta_label?: string
    cta_href?: string
  }
  announcement?: {
    enabled?: boolean
    text?: string
  }
  contact?: {
    phone?: string
    email?: string
    address?: string
    instagram?: string
    whatsapp?: string
  }
  seo?: {
    title?: string
    description?: string
  }
}

export type StoreMenuProjection = {
  operational_state: string
  locale: string
  currency_code: string
  ordering_enabled: boolean
  policies?: StoreFulfillmentPolicy[]
  menus: {
    id: string
    title: string
    subtitle?: string | null
    version?: number
    sections: {
      id: string
      title: string
      subtitle?: string | null
      products: {
        menu_product_id: string
        product_id: string
        is_featured?: boolean
        badge?: string | null
        available: boolean
        product: {
          id: string
          title?: string
          handle?: string
          thumbnail?: string | null
          status?: string
          variants?: {
            id: string
            title?: string
            calculated_price?: {
              calculated_amount?: number
              currency_code?: string
            } | null
          }[]
        } | null
      }[]
    }[]
  }[]
}
