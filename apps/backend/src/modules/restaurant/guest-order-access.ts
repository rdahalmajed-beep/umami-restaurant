import { createHmac, timingSafeEqual } from "crypto"

const TOKEN_PREFIX = "roa_"

function secret(): string {
  return (
    process.env.JWT_SECRET ||
    process.env.COOKIE_SECRET ||
    "dev-insecure-restaurant-order-access"
  )
}

export function createGuestOrderAccessToken(orderId: string): string {
  const digest = createHmac("sha256", secret())
    .update(`restaurant-order-access:${orderId}`)
    .digest("base64url")
  return `${TOKEN_PREFIX}${digest}`
}

export function verifyGuestOrderAccessToken(
  orderId: string,
  token: string | null | undefined
): boolean {
  if (!token || typeof token !== "string") {
    return false
  }
  const expected = createGuestOrderAccessToken(orderId)
  try {
    const a = Buffer.from(token)
    const b = Buffer.from(expected)
    if (a.length !== b.length) {
      return false
    }
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
