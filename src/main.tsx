import { StrictMode, useEffect, useMemo, useState, type FormEvent } from "react"
import { createRoot } from "react-dom/client"
import { ApplicationShell } from "@rocksoul/ui"
import "@rocksoul/ui/styles.css"
import "./styles.css"
import {
  fetchCases,
  fetchEdgeProvenance,
  fetchFreshness,
  fetchGraph,
  type CaseSummary,
  type CorrelationGraph,
  type EdgeProvenance,
  type EpistemicStatus,
  type FreshnessReport,
} from "./correlation-api"

const statusLabel: Record<EpistemicStatus, string> = {
  SUPPORTED: "Supported",
  PARTIAL: "Partial",
  DISPUTED: "Disputed",
  UNRESOLVED: "Unresolved",
  CONTRADICTED: "Contradicted",
  INDETERMINATE: "Indeterminate",
}

function App() {
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [graph, setGraph] = useState<CorrelationGraph>({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [freshness, setFreshness] = useState<FreshnessReport | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null)
  const [provenance, setProvenance] = useState<EdgeProvenance | null>(null)

  const loadCases = (q = "") => {
    setLoading(true)
    setError(null)
    return fetchCases(q)
      .then((items) => {
        setCases(items)
        setSelected((current) => items.some((item) => item.case_id === current) ? current : (items[0]?.case_id ?? null))
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    void loadCases()
    fetchFreshness().then(setFreshness).catch(() => setFreshness(null))
  }, [])

  useEffect(() => {
    if (!selected) {
      setGraph({ nodes: [], edges: [] })
      return
    }
    let active = true
    setError(null)
    setSelectedEdge(null)
    setProvenance(null)
    fetchGraph(selected)
      .then((value) => active && setGraph(value))
      .catch((cause: unknown) => active && setError(cause instanceof Error ? cause.message : String(cause)))
    return () => { active = false }
  }, [selected])

  useEffect(() => {
    if (!selectedEdge) {
      setProvenance(null)
      return
    }
    let active = true
    fetchEdgeProvenance(selectedEdge)
      .then((value) => active && setProvenance(value))
      .catch((cause: unknown) => active && setError(cause instanceof Error ? cause.message : String(cause)))
    return () => { active = false }
  }, [selectedEdge])

  const current = useMemo(() => cases.find((item) => item.case_id === selected) ?? null, [cases, selected])
  const staleCount = freshness?.counts.STALE_REVIEW_REQUIRED ?? 0
  const unavailableCount = freshness?.counts.UNAVAILABLE ?? 0

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    void loadCases(query)
  }

  return (
    <ApplicationShell
      activeResource="correlation"
      breadcrumbs={[{ label: "Public" }, { label: "Correlation Observatory" }]}
      backendState={error ? "degraded" : "online"}
      user={{ name: "Public Observer", role: "read-only" }}
    >
      <div className="observatory-shell">
        <header className="observatory-hero">
          <p className="eyebrow">MOONWITNESS · PUBLIC EVIDENCE GRAPH</p>
          <h1>Trace the relationship.<br />Keep the uncertainty visible.</h1>
          <p className="hero-copy">Correlation connects canonical STORY, EVENT, PERSON, TEXT, and LAW records without converting a relationship into causation, fulfillment, guilt, or certainty.</p>

          <form className="search-bar" onSubmit={submitSearch} role="search">
            <label htmlFor="correlation-search" className="sr-only">Search reviewed correlation cases</label>
            <input id="correlation-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cases: temple, jurisdiction, Oseberg…" />
            <button type="submit">Search evidence</button>
          </form>
        </header>

        {freshness ? (
          <section className={`freshness-banner ${staleCount > 0 || unavailableCount > 0 ? "needs-review" : "current"}`} aria-label="Canonical source freshness">
            <div>
              <span className="eyebrow">CANONICAL SOURCE FRESHNESS</span>
              <strong>{staleCount > 0 ? `${staleCount} owner repo${staleCount === 1 ? "" : "s"} moved — review required` : unavailableCount > 0 ? `${unavailableCount} owner check unavailable` : "All reviewed owner snapshots are current"}</strong>
            </div>
            <p>Repository movement never auto-invalidates an edge. It removes the assumption that the last review is still fresh.</p>
          </section>
        ) : null}

        {loading ? <section className="state-card" aria-live="polite">Loading reviewed correlation cases…</section> : null}
        {error ? <section className="state-card error-card" role="alert">Correlation service unavailable: {error}</section> : null}

        {!loading && cases.length === 0 ? <section className="state-card">No reviewed cases match this search.</section> : null}

        {!loading && cases.length > 0 ? (
          <div className="observatory-grid">
            <aside className="case-list" aria-label="Reviewed correlation cases">
              <div className="section-heading">
                <span>Reviewed cases</span>
                <strong>{cases.length}</strong>
              </div>
              {cases.map((item) => (
                <button key={item.case_id} className={`case-button ${selected === item.case_id ? "active" : ""}`} onClick={() => setSelected(item.case_id)}>
                  <span className="case-title">{item.title}</span>
                  <span className="case-meta">{item.domains.join(" × ")} · {item.edge_count} edges</span>
                </button>
              ))}
            </aside>

            <main className="evidence-panel">
              {current ? (
                <>
                  <div className="case-header">
                    <div>
                      <p className="eyebrow">{current.case_id}</p>
                      <h2>{current.title}</h2>
                      <p>{current.description}</p>
                    </div>
                    <div className="domain-stack" aria-label="Domains involved">
                      {current.domains.map((domain) => <span key={domain}>{domain}</span>)}
                    </div>
                  </div>

                  <div className="graph-summary" aria-label="Graph summary">
                    <div><span>Nodes</span><strong>{graph.nodes.length}</strong></div>
                    <div><span>Edges</span><strong>{graph.edges.length}</strong></div>
                    <div><span>Status types</span><strong>{current.epistemic_statuses.length}</strong></div>
                  </div>

                  <div className="edge-list">
                    {graph.edges.map((edge) => (
                      <article key={edge.id} className={`edge-card ${selectedEdge === edge.id ? "selected" : ""}`}>
                        <div className="edge-topline">
                          <span className="relation">{edge.relation_type.replaceAll("_", " ")}</span>
                          <span className="status-text">{statusLabel[edge.epistemic_status]} · {Math.round(edge.confidence * 100)}%</span>
                        </div>
                        <div className="edge-route">
                          <code>{edge.source}</code>
                          <span aria-hidden="true">→</span>
                          <code>{edge.target}</code>
                        </div>
                        <div className="evidence-columns">
                          <section>
                            <h3>Support</h3>
                            {edge.support.length ? edge.support.map((item) => <p key={item}>{item}</p>) : <p>None recorded.</p>}
                          </section>
                          <section>
                            <h3>Counterevidence</h3>
                            {edge.counterevidence.length ? edge.counterevidence.map((item) => <p key={item}>{item}</p>) : <p>None recorded.</p>}
                          </section>
                          <section>
                            <h3>Alternative explanations</h3>
                            {edge.alternative_explanations.length ? edge.alternative_explanations.map((item) => <p key={item}>{item}</p>) : <p>None recorded.</p>}
                          </section>
                        </div>
                        <button className="trace-button" onClick={() => setSelectedEdge(selectedEdge === edge.id ? null : edge.id)}>
                          {selectedEdge === edge.id ? "Hide provenance" : "Trace canonical owners"}
                        </button>

                        {selectedEdge === edge.id && provenance ? (
                          <div className="provenance-panel">
                            {[provenance.source, provenance.target].map((owner) => (
                              <a key={`${owner.owner_repository}:${owner.node.record_id}`} href={owner.owner_url} target="_blank" rel="noreferrer">
                                <span>{owner.owner_domain} · {owner.record_resolution}</span>
                                <strong>{owner.owner_repository}</strong>
                                <code>{owner.node.record_id}</code>
                                <small>Reviewed at {owner.observed_head_sha?.slice(0, 12) ?? "unknown"}</small>
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </>
              ) : null}
            </main>
          </div>
        ) : null}
      </div>
    </ApplicationShell>
  )
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>)
