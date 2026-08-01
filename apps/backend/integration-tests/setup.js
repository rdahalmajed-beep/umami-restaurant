/**
 * Jest setup for Medusa backend tests.
 * Loads test env; keeps unit tests free of a live database.
 */
const { loadEnv } = require("@medusajs/framework/utils")

try {
  loadEnv(process.env.NODE_ENV || "test", process.cwd())
} catch {
  // Env files are optional for pure unit tests.
}
