import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { Bricolage_Grotesque, Manrope } from "next/font/google"
import "styles/globals.css"

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-umami-display",
  display: "swap",
})

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-umami-sans",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: "Umami",
    template: "%s | Umami",
  },
  description: "Order from Umami — burgers, meals, sides, and drinks.",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans antialiased">
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
