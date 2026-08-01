const c = require("ansi-colors")

const requiredEnvs = [
  {
    key: "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
    description:
      "Admin → Settings → Publishable API Keys. For Vercel preview without backend yet, set pk_placeholder (menu still works from local catalog).",
  },
]

function checkEnvVariables() {
  const missingEnvs = requiredEnvs.filter(function (env) {
    return !process.env[env.key]
  })

  if (missingEnvs.length > 0) {
    // Allow CI / first Vercel deploy to build with catalog-only mode
    if (
      process.env.VERCEL ||
      process.env.CI ||
      process.env.ALLOW_MISSING_MEDUSA_KEY === "true"
    ) {
      console.warn(
        c.yellow(
          "\n⚠ Missing NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY — building with catalog-only mode.\n"
        )
      )
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY =
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_placeholder"
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
