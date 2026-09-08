import { access, readFile } from "node:fs/promises"
import path from "node:path"

const root=process.cwd()
const [main,readme,pkgRaw,styles]=await Promise.all([
  readFile(path.join(root,"src","main.tsx"),"utf8"),
  readFile(path.join(root,"README.md"),"utf8"),
  readFile(path.join(root,"package.json"),"utf8"),
  readFile(path.join(root,"src","styles.css"),"utf8"),
])
const pkg=JSON.parse(pkgRaw)
const failures=[]

for(const symbol of ["CinematicWebHero","MoonWitnessMark","ROCKSOUL_CINEMATIC_WEB_HERO_SYNC","MoonWitnessRegistryAssetImage","ResearchDomainOwnershipMap"]){
  if(!main.includes(symbol)) failures.push("shared UI symbol " + symbol)
}
if(!main.includes('<CinematicWebHero')) failures.push("CinematicWebHero consumption")
if(!main.includes('id="top"')) failures.push("top anchor")
if(!main.includes('archiveId="archive"')) failures.push("archive anchor")
if(!main.includes('href="#cases"')) failures.push("case CTA target")
if(!main.includes("footerMark=")) failures.push("consumer theme-control slot")
if(main.includes("function CinematicHero(")) failures.push("duplicate CinematicHero renderer")
if(main.includes("FALLBACK_HERO_ASSETS")||main.includes("loadHeroAssets")||main.includes("./hero-assets")) failures.push("duplicate hero asset loader")
for(const legacySelector of [".cinematic-hero{",".hero-master{",".hero-content{",".hero-evidence{",".archive-strip{"]){
  if(styles.includes(legacySelector)) failures.push(`legacy hero CSS ${legacySelector}`)
}
try{
  await access(path.join(root,"src","hero-assets.ts"))
  failures.push("legacy src/hero-assets.ts still exists")
}catch{}
if(!/^github:bjo163\/rocksoul-ui#[0-9a-f]{40}$/.test(pkg.dependencies?.["@rocksoul/ui"] ?? "")) failures.push("@rocksoul/ui immutable dependency")
if(!readme.includes("public hero is **owned by `@rocksoul/ui`**")) failures.push("README ownership contract")
if(!main.includes("PublicResearchVisuals") || !main.includes("ResearchDomainOwnershipMap")) failures.push("shared public research visual grammar")
for(const visual of ["correlation-network","provenance-chain","edge-unresolved"]) {
  if(!main.includes(`assetId: "${visual}"`) && !main.includes(`assetId="${visual}"`)) failures.push("shared research visual " + visual)
}

if(failures.length){
  console.error("UI hero ownership audit failed:")
  failures.forEach((failure)=>console.error(`- ${failure}`))
  process.exit(1)
}
console.log("UI hero ownership audit passed: rocksoul-web consumes @rocksoul/ui CinematicWebHero with no parallel renderer.")
