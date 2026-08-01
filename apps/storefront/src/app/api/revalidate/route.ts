import { createHmac, timingSafeEqual } from "crypto"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

function verify(signature: string | null, body: string, secret: string) {
  if (!signature) return false
  const expected = createHmac("sha256", secret).update(body).digest("hex")
  try {
    const a = new Uint8Array(Buffer.from(signature))
    const b = new Uint8Array(Buffer.from(expected))
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * POST /api/revalidate
 * Signed tag revalidation from Medusa backend (CACHE-001).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json(
      { message: "REVALIDATE_SECRET not configured" },
      { status: 503 }
    )
  }

  const body = await req.text()
  const signature = req.headers.get("x-revalidate-signature")
  if (!verify(signature, body, secret)) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 })
  }

  let parsed: { tags?: string[] }
  try {
    parsed = JSON.parse(body)
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
  }

  const tags = parsed.tags || []
  for (const tag of tags) {
    revalidateTag(tag)
  }

  return NextResponse.json({ revalidated: tags.length })
}
