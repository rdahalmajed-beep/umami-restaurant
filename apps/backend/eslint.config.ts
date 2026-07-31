import { defineConfig } from "eslint/config"
import medusa from "@medusajs/eslint-plugin"

export default defineConfig([
  ...medusa.configs.recommended,
  {
    files: ["src/modules/restaurant/models/**/*.{ts,js}"],
    rules: {
      // Intra-module DML relations; rule false-positives on same-module file imports.
      "@medusajs/link-no-cross-module-relationship": "off",
    },
  },
])
