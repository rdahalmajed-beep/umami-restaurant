const c = require("ansi-colors")

const requiredEnvs = [
  {
    key: "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
    description:
      "Admin → Settings → Publishable API Keys (pk_...). Required for Store API; no hardcoded catalog fallback.",
  },
]

function checkEnvVariables() {
  const missingEnvs = requiredEnvs.filter(function (env) {
    return !process.env[env.key]
  })

  if (missingEnvs.length > 0) {
    const isProdVercel = process.env.VERCEL_ENV === "production"
    const allowPlaceholder =
      !isProdVercel &&
      (process.env.CI === "true" ||
        process.env.ALLOW_MISSING_MEDUSA_KEY === "true" ||
        process.env.VERCEL_ENV === "preview")

    if (allowPlaceholder) {
      console.warn(
        c.yellow(
          "\n⚠ Missing NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY — using pk_placeholder for non-production build only.\n"
        )
      )
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_placeholder"
      return
    }

    console.error(
      c.red.bold("\n🚫 Error: Missing required environment variables\n")
    )

    missingEnvs.forEach(function (env) {
      console.error(c.yellow(`  ${c.bold(env.key)}`))
      if (env.description) {
        console.error(c.dim(`    ${env.description}\n`))
      }
    })

    console.error(
      c.yellow(
        "\nPlease set these variables in your .env file or environment before starting the application.\n"
      )
    )

    process.exit(1)
  }
}

module.exports = checkEnvVariables
