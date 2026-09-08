export interface HeroManifestEntry {
  id?: string
  path: string
  format?: string
  width?: number
  height?: number
  role?: string
  breakpoint?: string
  transparent?: boolean
  recommendedPosition?: string
  objectPosition?: string
  fallback?: string
}

export interface HeroManifest {
  assets?: HeroManifestEntry[]
  items?: HeroManifestEntry[]
  files?: HeroManifestEntry[]
}

export interface HeroAssets {
  source: "manifest" | "fallback"
  heroDesktop: string
  heroMobile: string
  rocksoul: string
  grid: string
  grain: string
  scanlines: string
  fog1?: string
  fog2?: string
  terrainForeground?: string
  terrainMidground?: string
  objectPositionDesktop: string
  objectPositionMobile: string
  archive: Array<{ label: string; code: string; asset: string }>
}

const RAW_ROOT = "https://raw.githubusercontent.com/bjo163/rocksoul-assets/main"
const PACK_ROOT = `${RAW_ROOT}/moonwitness/cinematic-web-hero`
const MANIFEST_URL = `${PACK_ROOT}/manifest.json`

export const FALLBACK_HERO_ASSETS: HeroAssets = {
  source: "fallback",
  heroDesktop: `${RAW_ROOT}/moonwitness/cinematic-hero-pack/png/observatory-night.png`,
  heroMobile: `${RAW_ROOT}/moonwitness/cinematic-hero-pack/png/lunar-horizon.png`,
  rocksoul: `${RAW_ROOT}/moonwitness/rocksoul-character-pack/png/512/observing.png`,
  grid: `${RAW_ROOT}/moonwitness/hero-backgrounds/svg/observatory-grid.svg`,
  grain: `${RAW_ROOT}/moonwitness/texture-material-pack/svg/lunar-grain.svg`,
  scanlines: `${RAW_ROOT}/moonwitness/texture-material-pack/svg/scanner-lines.svg`,
  objectPositionDesktop: "center center",
  objectPositionMobile: "center center",
  archive: [
    {
      label: "TRACES DON'T LIE.",
      code: "KODAK 400TX",
      asset: `${RAW_ROOT}/moonwitness/hero-backgrounds/png/lunar-trace.png`,
    },
    {
      label: "STILL HERE.",
      code: "36 / 36A",
      asset: `${RAW_ROOT}/moonwitness/hero-backgrounds/png/archive-texture.png`,
    },
    {
      label: "PEOPLE. PLACES. PATTERNS.",
      code: "SOURCE / 04",
      asset: `${RAW_ROOT}/moonwitness/hero-backgrounds/png/evidence-constellation.png`,
    },
    {
      label: "A CLEARER TOMORROW.",
      code: "CORR / 11",
      asset: `${RAW_ROOT}/moonwitness/hero-backgrounds/png/correlation-web.png`,
    },
  ],
}

function toUrl(path: string | undefined, fallback: string) {
  if (!path) return fallback
  if (/^https?:\/\//.test(path)) return path
  if (path.startsWith("moonwitness/")) return `${RAW_ROOT}/${path}`
  return `${PACK_ROOT}/${path.replace(/^\.\//, "").replace(/^\//, "")}`
}

function normalized(entry: HeroManifestEntry) {
  return `${entry.id ?? ""} ${entry.role ?? ""} ${entry.breakpoint ?? ""} ${entry.path}`.toLowerCase()
}

function pick(entries: HeroManifestEntry[], patterns: string[]) {
  return entries.find((entry) => {
    const value = normalized(entry)
    return patterns.every((pattern) => value.includes(pattern))
  })
}

function pickAny(entries: HeroManifestEntry[], alternatives: string[][]) {
  for (const patterns of alternatives) {
    const match = pick(entries, patterns)
    if (match) return match
  }
  return undefined
}

function archiveEntries(entries: HeroManifestEntry[]) {
  const explicit = entries.filter((entry) => /archive|contact|thumbnail/.test(normalized(entry)))
  const sorted = explicit.slice().sort((a, b) => normalized(a).localeCompare(normalized(b))).slice(0, 4)
  if (sorted.length < 4) return FALLBACK_HERO_ASSETS.archive
  const labels = [
    ["TRACES DON'T LIE.", "KODAK 400TX"],
    ["STILL HERE.", "36 / 36A"],
    ["PEOPLE. PLACES. PATTERNS.", "SOURCE / 04"],
    ["A CLEARER TOMORROW.", "CORR / 11"],
  ] as const
  return sorted.map((entry, index) => ({
    label: labels[index][0],
    code: labels[index][1],
    asset: toUrl(entry.path, FALLBACK_HERO_ASSETS.archive[index].asset),
  }))
}

export async function loadHeroAssets(): Promise<HeroAssets> {
  try {
    const response = await fetch(MANIFEST_URL, { cache: "no-store" })
    if (!response.ok) return FALLBACK_HERO_ASSETS
    const manifest = await response.json() as HeroManifest
    const entries = manifest.assets ?? manifest.items ?? manifest.files ?? []
    if (!Array.isArray(entries) || entries.length === 0) return FALLBACK_HERO_ASSETS

    const desktop = pickAny(entries, [
      ["hero-master", "desktop"],
      ["hero", "desktop"],
      ["static", "desktop"],
    ])
    const mobile = pickAny(entries, [
      ["hero-master", "mobile"],
      ["hero", "mobile"],
      ["static", "mobile"],
    ])
    const rocksoul = pickAny(entries, [["rocksoul", "observer"], ["rocksoul", "back"], ["rocksoul"]])
    const grid = pickAny(entries, [["observatory", "grid"], ["grid", "overlay"]])
    const grain = pickAny(entries, [["film", "grain"], ["grain", "overlay"]])
    const scanlines = pickAny(entries, [["scanline"], ["scanner", "line"]])
    const fog1 = pickAny(entries, [["fog", "01"], ["fog", "1"]])
    const fog2 = pickAny(entries, [["fog", "02"], ["fog", "2"]])
    const terrainForeground = pickAny(entries, [["terrain", "foreground"]])
    const terrainMidground = pickAny(entries, [["terrain", "midground"]])

    return {
      source: "manifest",
      heroDesktop: toUrl(desktop?.path, FALLBACK_HERO_ASSETS.heroDesktop),
      heroMobile: toUrl(mobile?.path, FALLBACK_HERO_ASSETS.heroMobile),
      rocksoul: toUrl(rocksoul?.path, FALLBACK_HERO_ASSETS.rocksoul),
      grid: toUrl(grid?.path, FALLBACK_HERO_ASSETS.grid),
      grain: toUrl(grain?.path, FALLBACK_HERO_ASSETS.grain),
      scanlines: toUrl(scanlines?.path, FALLBACK_HERO_ASSETS.scanlines),
      fog1: fog1 ? toUrl(fog1.path, "") : undefined,
      fog2: fog2 ? toUrl(fog2.path, "") : undefined,
      terrainForeground: terrainForeground ? toUrl(terrainForeground.path, "") : undefined,
      terrainMidground: terrainMidground ? toUrl(terrainMidground.path, "") : undefined,
      objectPositionDesktop: desktop?.objectPosition ?? desktop?.recommendedPosition ?? FALLBACK_HERO_ASSETS.objectPositionDesktop,
      objectPositionMobile: mobile?.objectPosition ?? mobile?.recommendedPosition ?? FALLBACK_HERO_ASSETS.objectPositionMobile,
      archive: archiveEntries(entries),
    }
  } catch {
    return FALLBACK_HERO_ASSETS
  }
}
