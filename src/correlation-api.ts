export type Domain = "STORY" | "EVENT" | "PERSON" | "TEXT" | "LAW"
export type EpistemicStatus = "SUPPORTED" | "PARTIAL" | "DISPUTED" | "UNRESOLVED" | "CONTRADICTED" | "INDETERMINATE"

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

const base = (import.meta.env.VITE_CORRELATION_API_URL as string | undefined)?.replace(/\/$/, "") ?? ""

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${base}${path}`, { headers: { accept: "application/json" } })
  if (!response.ok) throw new Error(`Correlation API ${response.status}`)
  return response.json() as Promise<T>
}

export async function fetchCases() {
  const response = await get<{ data: CaseSummary[] }>("/api/v1/correlation/cases")
  return response.data
}

export async function fetchGraph(caseId?: string) {
  const query = caseId ? `?case_id=${encodeURIComponent(caseId)}` : ""
  const response = await get<{ data: CorrelationGraph }>(`/api/v1/correlation/graph${query}`)
  return response.data
}
