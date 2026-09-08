import { StrictMode, useEffect, useMemo, useState, type FormEvent } from "react"
import { createRoot } from "react-dom/client"
import { CinematicWebHero, MoonWitnessMark, ROCKSOUL_CINEMATIC_WEB_HERO_SYNC } from "@rocksoul/ui"
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

function PublicHeader({ onSearch }: { onSearch: () => void }) {
  return (
    <header className="public-header">
      <a className="wordmark" href="#top" aria-label="MoonWitness home">MOONWITNESS</a>
      <span className="header-separator" aria-hidden="true" />
      <span className="observatory-label">INDEPENDENT OBSERVATORY</span>
      <nav className="public-nav" aria-label="Public navigation">
        <a href="#archive">ARCHIVE</a>
        <a href="#cases">CASES</a>
        <a href="#research">RESEARCH</a>
        <a href="#about">ABOUT</a>
      </nav>
      <button className="icon-control search-control" type="button" onClick={onSearch} aria-label="Search reviewed cases">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
      </button>
      <span className="live-archive"><i aria-hidden="true" /> LIVE ARCHIVE</span>
    </header>
  )
}

function PublicCinematicHero({ theme, onToggleTheme }: { theme: "dark" | "light"; onToggleTheme: () => void }) {
  return (
    <CinematicWebHero
      id="top"
      archiveId="archive"
      action={
        <a className="mw-cinematic-web-hero__cta" href="#cases">
          ENTER THE CASE <span aria-hidden="true">→</span>
        </a>
      }
      footerRight={<>A MORE CURIOUS TOMORROW</>}
      footerMark={
        <button
          className="phase-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          <b aria-hidden="true">{theme === "dark" ? "◕◕◯" : "◯◕◕"}</b>
        </button>
      }
    />
  )
}

function ResearchManifesto() {
  return (
    <section id="research" className="research-manifesto">
      <div className="section-number">02 / METHOD</div>
      <div>
        <p className="section-kicker">OBSERVE → TRACE → RECONSTRUCT → WEIGH → VERIFY</p>
        <h2>Mystery can stay.<br />Evidence cannot hide.</h2>
      </div>
      <div className="manifesto-copy">
        <p>MoonWitness is not built to make every trail become a conclusion. A story may align with an event. A person may remain partial. A text may preserve the motif.</p>
        <p>The public observatory keeps provenance visible, correlation explainable, legal boundaries separate, and unresolved questions visibly unresolved.</p>
      </div>
    </section>
  )
}

function CorrelationObservatory() {
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
    <section id="cases" className="case-observatory">
      <header className="case-observatory-header">
        <div>
          <p className="section-kicker">03 / PUBLIC CORRELATION OBSERVATORY</p>
          <h2>TRACE THE RELATIONSHIP.<br />KEEP UNCERTAINTY VISIBLE.</h2>
        </div>
        <p>Correlation connects canonical STORY, EVENT, PERSON, TEXT, and LAW records without converting a relationship into causation, fulfillment, guilt, or certainty.</p>
      </header>

      <form className="case-search" onSubmit={submitSearch} role="search">
        <label htmlFor="correlation-search" className="sr-only">Search reviewed correlation cases</label>
        <input id="correlation-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reviewed cases…" />
        <button type="submit">SEARCH EVIDENCE</button>
      </form>

      {freshness ? (
        <div className={`freshness-line ${staleCount > 0 || unavailableCount > 0 ? "needs-review" : "current"}`}>
          <span>CANONICAL SOURCE FRESHNESS</span>
          <strong>{staleCount > 0 ? `${staleCount} owner repo${staleCount === 1 ? "" : "s"} moved — review required` : unavailableCount > 0 ? `${unavailableCount} owner check unavailable` : "All reviewed owner snapshots are current"}</strong>
          <p>Repository movement never auto-invalidates an edge. It removes the assumption that the last review is still fresh.</p>
        </div>
      ) : null}

      {loading ? <div className="case-state" aria-live="polite">LOADING REVIEWED CORRELATION CASES…</div> : null}
      {error ? <div className="case-state error" role="alert">CORRELATION SERVICE UNAVAILABLE — {error}</div> : null}
      {!loading && cases.length === 0 ? <div className="case-state">NO REVIEWED CASES MATCH THIS SEARCH.</div> : null}

      {!loading && cases.length > 0 ? (
        <div className="case-workbench">
          <aside className="case-index-list" aria-label="Reviewed correlation cases">
            <div className="case-list-heading"><span>REVIEWED CASES</span><strong>{cases.length.toString().padStart(2, "0")}</strong></div>
            {cases.map((item) => (
              <button key={item.case_id} className={selected === item.case_id ? "active" : ""} onClick={() => setSelected(item.case_id)}>
                <span>{item.title}</span>
                <small>{item.domains.join(" × ")} · {item.edge_count} EDGES</small>
              </button>
            ))}
          </aside>

          <main className="case-detail">
            {current ? (
              <>
                <div className="case-title-block">
                  <div>
                    <p>{current.case_id}</p>
                    <h3>{current.title}</h3>
                    <span>{current.description}</span>
                  </div>
                  <div className="case-domains" aria-label="Domains involved">
                    {current.domains.map((domain) => <span key={domain}>{domain}</span>)}
                  </div>
                </div>

                <div className="graph-metrics" aria-label="Graph summary">
                  <div><span>NODES</span><strong>{graph.nodes.length.toString().padStart(2, "0")}</strong></div>
                  <div><span>EDGES</span><strong>{graph.edges.length.toString().padStart(2, "0")}</strong></div>
                  <div><span>STATUS TYPES</span><strong>{current.epistemic_statuses.length.toString().padStart(2, "0")}</strong></div>
                </div>

                <div className="edge-list">
                  {graph.edges.map((edge) => (
                    <article key={edge.id} className={`edge-card ${selectedEdge === edge.id ? "selected" : ""}`}>
                      <div className="edge-topline">
                        <span className="relation">{edge.relation_type.replaceAll("_", " ")}</span>
                        <span>{statusLabel[edge.epistemic_status]} · {Math.round(edge.confidence * 100)}%</span>
                      </div>
                      <div className="edge-route">
                        <code>{edge.source}</code>
                        <span aria-hidden="true">→</span>
                        <code>{edge.target}</code>
                      </div>
                      <div className="evidence-columns">
                        <section>
                          <h4>SUPPORT</h4>
                          {edge.support.length ? edge.support.map((item) => <p key={item}>{item}</p>) : <p>None recorded.</p>}
                        </section>
                        <section>
                          <h4>COUNTEREVIDENCE</h4>
                          {edge.counterevidence.length ? edge.counterevidence.map((item) => <p key={item}>{item}</p>) : <p>None recorded.</p>}
                        </section>
                        <section>
                          <h4>ALTERNATIVE EXPLANATIONS</h4>
                          {edge.alternative_explanations.length ? edge.alternative_explanations.map((item) => <p key={item}>{item}</p>) : <p>None recorded.</p>}
                        </section>
                      </div>
                      <button className="trace-button" onClick={() => setSelectedEdge(selectedEdge === edge.id ? null : edge.id)}>
                        {selectedEdge === edge.id ? "HIDE PROVENANCE" : "TRACE CANONICAL OWNERS"}
                      </button>

                      {selectedEdge === edge.id && provenance ? (
                        <div className="provenance-panel">
                          {[provenance.source, provenance.target].map((owner) => (
                            <a key={`${owner.owner_repository}:${owner.node.record_id}`} href={owner.owner_url} target="_blank" rel="noreferrer">
                              <span>{owner.owner_domain} · {owner.record_resolution}</span>
                              <strong>{owner.owner_repository}</strong>
                              <code>{owner.node.record_id}</code>
                              <small>REVIEWED AT {owner.observed_head_sha?.slice(0, 12) ?? "UNKNOWN"}</small>
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
    </section>
  )
}

function AboutFooter() {
  return (
    <footer id="about" className="about-footer">
      <div className="footer-brand">
        <MoonWitnessMark className="footer-mark" />
        <div><strong>MOONWITNESS</strong><span>INDEPENDENT OBSERVATORY</span></div>
      </div>
      <p>MoonWitness watches. Rocksoul follows. The record connects. The law draws the line. The trail stays inspectable.</p>
      <div className="footer-meta"><span>ROCKSOUL / PUBLIC WEB</span><span>TRUTH LEAVES A TRACE.</span></div>
    </footer>
  )
}

function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = window.localStorage.getItem("moonwitness-theme")
    return saved === "light" ? "light" : "dark"
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem("moonwitness-theme", theme)
  }, [theme])

  return (
    <div className="public-observatory" data-hero-assets-commit={ROCKSOUL_CINEMATIC_WEB_HERO_SYNC.commit}>
      <PublicHeader onSearch={() => {
        document.getElementById("cases")?.scrollIntoView({ behavior: "smooth", block: "start" })
        window.setTimeout(() => document.getElementById("correlation-search")?.focus(), 350)
      }} />
      <main>
        <PublicCinematicHero theme={theme} onToggleTheme={() => setTheme((value) => value === "dark" ? "light" : "dark")} />
        <ResearchManifesto />
        <CorrelationObservatory />
      </main>
      <AboutFooter />
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>)
