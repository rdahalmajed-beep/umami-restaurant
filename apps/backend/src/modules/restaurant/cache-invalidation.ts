/**
 * CACHE-001 — projection / storefront invalidation helper
 */
import { createHmac } from "crypto"

export function signRevalidatePayload(
  payload: string,
  secret: string
): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

export async function revalidateStorefrontTags(tags: string[]): Promise<void> {
  const base = process.env.STOREFRONT_REVALIDATE_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!base || !secret) {
    return
  }

  const body = JSON.stringify({ tags, at: Date.now() })
  const signature = signRevalidatePayload(body, secret)

  try {
    await fetch(base, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-signature": signature,
      },
      body,
    })
  } catch {
    // Async retry belongs in outbox; do not block admin writes.
  }
}
