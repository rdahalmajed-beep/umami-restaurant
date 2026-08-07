import { Metadata } from "next"

import Hero from "@modules/home/components/hero"
import MenuTemplate from "@modules/menu/templates"
import { BRAND_NAME, BRAND_TAGLINE } from "@lib/constants/brand"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: BRAND_NAME,
    description: BRAND_TAGLINE,
  }
}

type Props = {
  params: Promise<{ countryCode: string }>
}

/**
 * Home: brand hero + Medusa-backed restaurant menu (Store API / menu projection).
 */
export default async function Home(props: Props) {
  const params = await props.params

  return (
    <div className="umami-atmosphere min-h-[calc(100vh-64px)]">
      <Hero />
      <MenuTemplate countryCode={params.countryCode} compactHeader />
    </div>
  )
}
