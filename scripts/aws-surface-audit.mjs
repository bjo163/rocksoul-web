import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const [aws, main, hostingRaw] = await Promise.all([
  readFile(path.join(root, "src", "aws-app.tsx"), "utf8"),
  readFile(path.join(root, "src", "main.tsx"), "utf8"),
  readFile(path.join(root, "wrangler.jsonc"), "utf8"),
])

const hosting = JSON.parse(hostingRaw)
const failures = []

for (const symbol of [
  "ApplicationShell",
  "AWSBoundary",
  "AWSLegalScreen",
  "LegalStatus",
  "MoonWitnessAssetProvider",
  "MOONWITNESS_STABLE_REPOSITORY_BASE",
  "ResearchDomainOwnershipMap",
]) {
  if (!aws.includes(symbol)) failures.push(`missing @rocksoul/ui ownership symbol: ${symbol}`)
}

if (aws.includes("raw.githubusercontent.com/bjo163/rocksoul-assets/")) {
  failures.push("AWS surface must not duplicate a rocksoul-assets revision outside @rocksoul/ui")
}

for (const proof of ["legalResultVocabulary", "applicabilityAxes", "automaticVerdictPaths", "metricCount(apiRoutes)"]) {
  if (!aws.includes(proof)) failures.push(`derived AWS metric contract: ${proof}`)
}
if (/<strong>0\d<\/strong>/.test(aws)) failures.push("AWS overview metric counts must be derived, not literal")

if (!aws.includes("VITE_AWS_API_URL")) failures.push("VITE_AWS_API_URL runtime boundary")
if (!aws.includes('credentials: "include"')) failures.push("authenticated AWS API credentials boundary")
if (!main.includes('window.location.pathname === "/aws"')) failures.push("/aws application entry")

if (hosting.assets?.not_found_handling !== "single-page-application") {
  failures.push("Cloudflare /aws SPA fallback")
}

if (failures.length) {
  console.error("AWS surface ownership audit failed:")
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log("AWS surface ownership audit passed: rocksoul-web consumes @rocksoul/ui and its pinned rocksoul-assets revision.")
