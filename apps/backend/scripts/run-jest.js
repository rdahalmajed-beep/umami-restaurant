/**
 * Cross-platform Jest runner (Windows-safe env vars).
 * Usage: node ./scripts/run-jest.js unit [--silent]
 */
const { spawnSync } = require("child_process")
const path = require("path")

const testType = process.argv[2] || "unit"
const extra = process.argv.slice(3)

process.env.TEST_TYPE = testType
process.env.NODE_OPTIONS = [
  process.env.NODE_OPTIONS,
  "--experimental-vm-modules",
]
  .filter(Boolean)
  .join(" ")

const jestBin = path.join(
  __dirname,
  "..",
  "node_modules",
  "jest",
  "bin",
  "jest.js"
)

const result = spawnSync(
  process.execPath,
  [jestBin, "--runInBand", "--forceExit", ...extra],
  {
    stdio: "inherit",
    env: process.env,
    cwd: path.join(__dirname, ".."),
  }
)

process.exit(result.status ?? 1)
