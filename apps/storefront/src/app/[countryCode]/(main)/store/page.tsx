import { Metadata } from "next"

import MenuTemplate from "@modules/menu/templates"

export const metadata: Metadata = {
  title: "القائمة | Menu",
  description: "Umami ramen, sides, and drinks — Manama.",
}

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ countryCode: string }>
}

/**
 * Store menu: Medusa products + restaurant menu projection (one source of truth).
 */
export default async function StorePage(props: Props) {
  const params = await props.params

  return (
    <div data-testid="menu-page">
      <MenuTemplate countryCode={params.countryCode} />
    </div>
  )
}
