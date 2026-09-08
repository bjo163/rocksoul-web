export type Domain = "STORY" | "EVENT" | "PERSON" | "TEXT" | "LAW"
export type EpistemicStatus = "SUPPORTED" | "PARTIAL" | "DISPUTED" | "UNRESOLVED" | "CONTRADICTED" | "INDETERMINATE"
export type FreshnessState = "CURRENT" | "STALE_REVIEW_REQUIRED" | "UNAVAILABLE"

export interface CaseSummary {
  case_id: string
  title: string
  status: string
  description: string
  edge_count: number
  domains: Domain[]
  epistemic_statuses: EpistemicStatus[]
}

export interface GraphNode {
  id: string
  repository: string
  domain: Domain
  record_id: string
  resolution?: "canonical" | "candidate"
}

export interface GraphEdge {
  id: string
  case_id: string
  source: string
  target: string
  relation_type: string
  confidence: number
  epistemic_status: EpistemicStatus
  support: string[]
  counterevidence: string[]
  alternative_explanations: string[]
}

export interface CorrelationGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface NodeProvenance {
  node: GraphNode
  owner_repository: string
  owner_domain: Domain
  owner_branch: string
  observed_head_sha: string | null
  owner_url: string
  record_resolution: string
  freshness_policy: string
}

export interface EdgeProvenance {
  edge: GraphEdge
  source: NodeProvenance
  target: NodeProvenance
}

export interface FreshnessRepository {
  repository: string
  domain: Domain
  branch: string
  observed_head_sha: string
  current_head_sha: string | null
  freshness: FreshnessState
}

export interface FreshnessReport {
  generated_at: string
  snapshot_generated_at: string
  policy: string
  counts: Record<FreshnessState, number>
  repositories: FreshnessRepository[]
}

interface CorrelationRef {
  repository: string
  domain: Domain
  record_id: string
  resolution?: "canonical" | "candidate"
}

interface RawCorrelationEdge {
  id: string
  source_ref: CorrelationRef
  target_ref: CorrelationRef
  relation_type: string
  confidence: number
  epistemic_status: EpistemicStatus
  support?: string[]
  counterevidence?: string[]
  alternative_explanations?: string[]
}

interface RawCorrelationCase {
  case_id: string
  title: string
  status: string
  description: string
  edges: RawCorrelationEdge[]
}

interface ProvenanceSnapshot {
  generated_at: string
  policy: string
  repositories: Record<string, {
    domain: Domain
    branch: string
    observed_head_sha: string
  }>
}

const base = (import.meta.env.VITE_CORRELATION_API_URL as string | undefined)?.replace(/\/$/, "") ?? ""
const RAW_ROOT = "https://raw.githubusercontent.com/bjo163/rocksoul-correlation/main"
const FALLBACK_CASE_FILES = [
  "bath-curse-tablets.json",
  "icc-temporal-jurisdiction.json",
  "jerusalem-70.json",
  "lindow-man.json",
  "oseberg-women.json",
] as const

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<T>
}

async function loadFallbackCases() {
  return Promise.all(FALLBACK_CASE_FILES.map((name) => fetchJson<RawCorrelationCase>(`${RAW_ROOT}/data/cases/${name}`)))
}

function summarizeCase(item: RawCorrelationCase): CaseSummary {
  const domains = new Set<Domain>()
  const statuses = new Set<EpistemicStatus>()
  for (const edge of item.edges ?? []) {
    domains.add(edge.source_ref.domain)
    domains.add(edge.target_ref.domain)
    statuses.add(edge.epistemic_status)
  }
  return {
    case_id: item.case_id,
    title: item.title,
    status: item.status,
    description: item.description,
    edge_count: item.edges?.length ?? 0,
    domains: [...domains].sort(),
    epistemic_statuses: [...statuses].sort(),
  }
}

function nodeId(ref: CorrelationRef) {
  return `${ref.repository}:${ref.record_id}`
}

function graphFromCases(items: RawCorrelationCase[]): CorrelationGraph {
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []
  for (const item of items) {
    for (const edge of item.edges ?? []) {
      for (const ref of [edge.source_ref, edge.target_ref]) {
        const id = nodeId(ref)
        if (!nodes.has(id)) nodes.set(id, { id, ...ref })
      }
      edges.push({
        id: edge.id,
        case_id: item.case_id,
        source: nodeId(edge.source_ref),
        target: nodeId(edge.target_ref),
        relation_type: edge.relation_type,
        confidence: edge.confidence,
        epistemic_status: edge.epistemic_status,
        support: edge.support ?? [],
        counterevidence: edge.counterevidence ?? [],
        alternative_explanations: edge.alternative_explanations ?? [],
      })
    }
  }
  return { nodes: [...nodes.values()], edges }
}

async function fallbackCases(q = "") {
  const query = q.trim().toLowerCase()
  return (await loadFallbackCases())
    .map(summarizeCase)
    .filter((item) => !query || `${item.case_id} ${item.title} ${item.description}`.toLowerCase().includes(query))
}

async function fallbackGraph(caseId?: string) {
  const cases = await loadFallbackCases()
  const selected = caseId ? cases.filter((item) => item.case_id === caseId) : cases
  return graphFromCases(selected)
}

async function fallbackProvenance(edgeId: string): Promise<EdgeProvenance> {
  const cases = await loadFallbackCases()
  const match = cases.flatMap((item) => item.edges.map((edge) => ({ item, edge }))).find(({ edge }) => edge.id === edgeId)
  if (!match) throw new Error("Correlation fallback edge not found")

  const snapshot = await fetchJson<ProvenanceSnapshot>(`${RAW_ROOT}/data/provenance-snapshots.json`)
  const graphEdge = graphFromCases([match.item]).edges.find((edge) => edge.id === edgeId)
  if (!graphEdge) throw new Error("Correlation fallback graph edge not found")

  const envelope = (ref: CorrelationRef): NodeProvenance => {
    const owner = snapshot.repositories[ref.repository]
    return {
      node: { id: nodeId(ref), ...ref },
      owner_repository: ref.repository,
      owner_domain: ref.domain,
      owner_branch: owner?.branch ?? "main",
      observed_head_sha: owner?.observed_head_sha ?? null,
      owner_url: `https://github.com/bjo163/${ref.repository}`,
      record_resolution: ref.resolution ?? "canonical",
      freshness_policy: snapshot.policy,
    }
  }

  return {
    edge: graphEdge,
    source: envelope(match.edge.source_ref),
    target: envelope(match.edge.target_ref),
  }
}

async function fallbackFreshness(): Promise<FreshnessReport> {
  const snapshot = await fetchJson<ProvenanceSnapshot>(`${RAW_ROOT}/data/provenance-snapshots.json`)
  const repositories = Object.entries(snapshot.repositories).map(([repository, owner]) => ({
    repository,
    domain: owner.domain,
    branch: owner.branch,
    observed_head_sha: owner.observed_head_sha,
    current_head_sha: null,
    freshness: "UNAVAILABLE" as const,
  }))
  return {
    generated_at: new Date().toISOString(),
    snapshot_generated_at: snapshot.generated_at,
    policy: `${snapshot.policy} Public-web fallback is reading the reviewed snapshot directly; live owner-head comparison is unavailable until the runtime API is connected.`,
    counts: {
      CURRENT: 0,
      STALE_REVIEW_REQUIRED: 0,
      UNAVAILABLE: repositories.length,
    },
    repositories,
  }
}

async function get<T>(path: string, fallback: () => Promise<T>): Promise<T> {
  try {
    const response = await fetch(`${base}${path}`, { headers: { accept: "application/json" } })
    if (!response.ok) throw new Error(`Correlation API ${response.status}`)
    return await response.json() as T
  } catch {
    return fallback()
  }
}

export async function fetchCases(q = "") {
  const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""
  const response = await get<{ data: CaseSummary[] }>(
    `/api/v1/correlation/cases${query}`,
    async () => ({ data: await fallbackCases(q) }),
  )
  return response.data
}

export async function fetchGraph(caseId?: string) {
  const query = caseId ? `?case_id=${encodeURIComponent(caseId)}` : ""
  const response = await get<{ data: CorrelationGraph }>(
    `/api/v1/correlation/graph${query}`,
    async () => ({ data: await fallbackGraph(caseId) }),
  )
  return response.data
}

export async function fetchEdgeProvenance(edgeId: string) {
  const response = await get<{ data: EdgeProvenance }>(
    `/api/v1/correlation/edges/${encodeURIComponent(edgeId)}/provenance`,
    async () => ({ data: await fallbackProvenance(edgeId) }),
  )
  return response.data
}

export async function fetchFreshness() {
  const response = await get<{ data: FreshnessReport }>(
    "/api/v1/correlation/freshness",
    async () => ({ data: await fallbackFreshness() }),
  )
  return response.data
}
