"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import type { StoreBranch, StoreModifierGroup } from "types/restaurant"

export async function getProductModifiers(
  productId: string
): Promise<StoreModifierGroup[]> {
  const headers = {
    ...(await getAuthHeaders()),
  }
  const next = {
    ...(await getCacheOptions("products")),
  }

  return sdk.client
    .fetch<{
      product_id: string
      modifier_groups: StoreModifierGroup[]
    }>(`/store/restaurant/products/${productId}/modifiers`, {
      method: "GET",
      headers,
      next,
      cache: "force-cache",
    })
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
}

export async function getOrderRestaurantStatus(
  orderId: string
): Promise<StoreRestaurantOrderStatus> {
  const headers = {
    ...(await getAuthHeaders()),
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
