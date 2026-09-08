import { StrictMode, useEffect, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import { ApplicationShell } from "@rocksoul/ui"
import "@rocksoul/ui/styles.css"
import "./styles.css"
import { fetchCases, fetchGraph, type CaseSummary, type CorrelationGraph, type EpistemicStatus } from "./correlation-api"

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

  useEffect(() => {
    let active = true
    fetchCases()
      .then((items) => {
        if (!active) return
        setCases(items)
        setSelected(items[0]?.case_id ?? null)
      })
      .catch((cause: unknown) => active && setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selected) return
    let active = true
    setError(null)
    fetchGraph(selected)
      .then((value) => active && setGraph(value))
      .catch((cause: unknown) => active && setError(cause instanceof Error ? cause.message : String(cause)))
    return () => { active = false }
  }, [selected])

  const current = useMemo(() => cases.find((item) => item.case_id === selected) ?? null, [cases, selected])

  return (
    <ApplicationShell
      activeResource="cases"
      breadcrumbs={[{ label: "Public" }, { label: "Correlation Observatory" }]}
      backendState={error ? "degraded" : "online"}
      user={{ name: "Public Observer", role: "read-only" }}
    >
      <div className="observatory-shell">
        <header className="observatory-hero">
          <p className="eyebrow">MOONWITNESS · PUBLIC EVIDENCE GRAPH</p>
          <h1>Trace the relationship.<br />Keep the uncertainty visible.</h1>
          <p className="hero-copy">Correlation connects canonical STORY, EVENT, PERSON, TEXT, and LAW records without converting a relationship into causation, fulfillment, guilt, or certainty.</p>
        </header>

        {loading ? <section className="state-card" aria-live="polite">Loading reviewed correlation cases…</section> : null}
        {error ? <section className="state-card error-card" role="alert">Correlation service unavailable: {error}</section> : null}

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
                      <article key={edge.id} className="edge-card">
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
