import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const [aws, main, vercelRaw] = await Promise.all([
  readFile(path.join(root, "src", "aws-app.tsx"), "utf8"),
  readFile(path.join(root, "src", "main.tsx"), "utf8"),
  readFile(path.join(root, "vercel.json"), "utf8"),
])

const vercel = JSON.parse(vercelRaw)
const failures = []

for (const symbol of [
  "ApplicationShell",
  "AWSBoundary",
  "AWSLegalScreen",
  "LegalStatus",
  "MoonWitnessAssetProvider",
  "MOONWITNESS_STABLE_REPOSITORY_BASE",
]) {
  if (!aws.includes(symbol)) failures.push(`missing @rocksoul/ui ownership symbol: ${symbol}`)
}

if (aws.includes("raw.githubusercontent.com/bjo163/rocksoul-assets/")) {
  failures.push("AWS surface must not duplicate a rocksoul-assets revision outside @rocksoul/ui")
}

if (!aws.includes("VITE_AWS_API_URL")) failures.push("VITE_AWS_API_URL runtime boundary")
if (!aws.includes('credentials: "include"')) failures.push("authenticated AWS API credentials boundary")
if (!main.includes('window.location.pathname === "/aws"')) failures.push("/aws application entry")

const rewrites = Array.isArray(vercel.rewrites) ? vercel.rewrites : []
if (!rewrites.some((entry) => entry?.source === "/aws" && entry?.destination === "/index.html")) {
  failures.push("Vercel /aws SPA rewrite")
}

if (failures.length) {
  console.error("AWS surface ownership audit failed:")
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log("AWS surface ownership audit passed: rocksoul-web consumes @rocksoul/ui and its pinned rocksoul-assets revision.")
