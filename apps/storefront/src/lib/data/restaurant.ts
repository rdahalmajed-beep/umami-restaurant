"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import type {
  StoreBranch,
  StoreBrandContent,
  StoreFulfillmentPolicy,
  StoreMenuProjection,
  StoreModifierGroup,
} from "types/restaurant"

export async function getProductModifiers(
  productId: string,
  opts?: { branchId?: string | null; variantId?: string | null }
): Promise<StoreModifierGroup[]> {
  const headers = {
    ...(await getAuthHeaders()),
  }
  const next = {
    ...(await getCacheOptions("products")),
  }

  const qs = new URLSearchParams()
  if (opts?.branchId) qs.set("branch_id", opts.branchId)
  if (opts?.variantId) qs.set("variant_id", opts.variantId)
  const q = qs.toString()

  return sdk.client
    .fetch<{
      product_id: string
      modifier_groups: StoreModifierGroup[]
    }>(
      `/store/restaurant/products/${productId}/modifiers${q ? `?${q}` : ""}`,
      {
        method: "GET",
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then((res) => res.modifier_groups || [])
    .catch(() => [])
}

export async function listActiveBranches(): Promise<StoreBranch[]> {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client
    .fetch<{ branches: StoreBranch[] }>(`/store/restaurant/branches`, {
      method: "GET",
      headers,
      cache: "no-store",
    })
    .then((res) => res.branches || [])
    .catch(() => [])
}

export async function getRestaurantMenuProjection(opts?: {
  branchId?: string | null
  orderType?: "delivery" | "pickup" | null
  locale?: string | null
  currencyCode?: string | null
}): Promise<StoreMenuProjection | null> {
  const headers = {
    ...(await getAuthHeaders()),
  }
  const baseMenu = await getCacheOptions("restaurant-menu")
  const next = {
    ...baseMenu,
    tags: [...(baseMenu.tags || []), "restaurant-menu"],
  }

  const qs = new URLSearchParams()
  if (opts?.branchId) qs.set("branch_id", opts.branchId)
  if (opts?.orderType) qs.set("order_type", opts.orderType)
  if (opts?.locale) qs.set("locale", opts.locale)
  if (opts?.currencyCode) qs.set("currency_code", opts.currencyCode)
  const q = qs.toString()

  return sdk.client
    .fetch<StoreMenuProjection>(`/store/restaurant/menu${q ? `?${q}` : ""}`, {
      method: "GET",
      headers,
      next,
      cache: "force-cache",
    })
    .catch(() => null)
}

export async function getRestaurantBrandContent(
  locale = "ar"
): Promise<StoreBrandContent> {
  const headers = {
    ...(await getAuthHeaders()),
  }
  const baseContent = await getCacheOptions("restaurant-content")
  const next = {
    ...baseContent,
    tags: [...(baseContent.tags || []), "restaurant-content"],
  }

  return sdk.client
    .fetch<{ content: { content_json?: StoreBrandContent } }>(
      `/store/restaurant/content?key=brand&locale=${encodeURIComponent(locale)}`,
      {
        method: "GET",
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then((res) => res.content?.content_json || {})
    .catch(() => ({}))
}

export async function getFulfillmentPolicies(opts?: {
  branchId?: string | null
  orderType?: "delivery" | "pickup" | null
}): Promise<StoreFulfillmentPolicy[]> {
  const headers = {
    ...(await getAuthHeaders()),
  }
  const qs = new URLSearchParams()
  if (opts?.branchId) qs.set("branch_id", opts.branchId)
  if (opts?.orderType) qs.set("order_type", opts.orderType)
  const q = qs.toString()

  return sdk.client
    .fetch<{ policies: StoreFulfillmentPolicy[] }>(
      `/store/restaurant/fulfillment-policies${q ? `?${q}` : ""}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    )
    .then((res) => res.policies || [])
    .catch(() => [])
}

export type StoreRestaurantOrderStatus = {
  restaurant_order: {
    order_id: string
    status: string
    order_type?: "delivery" | "pickup" | null
    branch_id?: string | null
    last_transition_at?: string | null
  } | null
  branch: {
    id: string
    name: string
    address?: string | null
    preparation_minutes: number
  } | null
  missing_restaurant_order?: boolean
}

export async function getOrderRestaurantStatus(
  orderId: string,
  accessToken?: string | null
): Promise<StoreRestaurantOrderStatus> {
  const headers: Record<string, string> = {
    ...(await getAuthHeaders()),
  }
  if (accessToken) {
    headers["x-restaurant-order-token"] = accessToken
  }

  return sdk.client
    .fetch<StoreRestaurantOrderStatus>(
      `/store/restaurant/orders/${orderId}/status`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    )
    .catch(() => ({ restaurant_order: null, branch: null }))
}

export async function claimOrderRestaurantAccess(
  orderId: string,
  email: string
): Promise<string | null> {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client
    .fetch<{ access_token: string }>(
      `/store/restaurant/orders/${orderId}/access`,
      {
        method: "POST",
        headers,
        body: { email },
        cache: "no-store",
      }
    )
    .then((res) => res.access_token || null)
    .catch(() => null)
}
