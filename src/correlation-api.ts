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
  edge: GraphEdge & Record<string, unknown>
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

const base = (import.meta.env.VITE_CORRELATION_API_URL as string | undefined)?.replace(/\/$/, "") ?? ""

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${base}${path}`, { headers: { accept: "application/json" } })
  if (!response.ok) throw new Error(`Correlation API ${response.status}`)
  return response.json() as Promise<T>
}

export async function fetchCases(q = "") {
  const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""
  const response = await get<{ data: CaseSummary[] }>(`/api/v1/correlation/cases${query}`)
  return response.data
}

export async function fetchGraph(caseId?: string) {
  const query = caseId ? `?case_id=${encodeURIComponent(caseId)}` : ""
  const response = await get<{ data: CorrelationGraph }>(`/api/v1/correlation/graph${query}`)
  return response.data
}

export async function fetchEdgeProvenance(edgeId: string) {
  const response = await get<{ data: EdgeProvenance }>(`/api/v1/correlation/edges/${encodeURIComponent(edgeId)}/provenance`)
  return response.data
}

export async function fetchFreshness() {
  const response = await get<{ data: FreshnessReport }>("/api/v1/correlation/freshness")
  return response.data
}
