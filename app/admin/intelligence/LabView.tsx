import Link from "next/link";
import type { ReactNode } from "react";
import type { GraphEvidence } from "@/lib/intelligence/contracts";
import type { LabResult, LabSection } from "@/lib/intelligence/lab-types";
import { confidenceLabel, safeSourceUrl, scalarStatistics } from "@/lib/intelligence/lab-format";
import { OpportunityCard, SignalCard } from "./IntelligenceCards";
import { ContentEvidence } from "./ContentEvidence";

const muted = "text-sm text-neutral-600 dark:text-neutral-400";
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffbb00]";
const panel = "min-w-0 rounded-md border border-neutral-300 bg-white p-5 dark:border-neutral-800 dark:bg-[#111318]";

function Section<T>({ title, section, empty, children, description }: { title: string; section: LabSection<T>; empty: string; children: ReactNode; description?: string }) {
  return <section className={panel} aria-label={title}>
    <h2 className="mb-2 text-lg font-semibold">{title}</h2>
    {description && <p className={`${muted} mb-4`}>{description}</p>}
    {section.state === "unavailable" && <p role="status" className="mb-3 text-sm text-amber-700 dark:text-amber-300">This section could not be loaded. A required database migration or connection may be unavailable.</p>}
    {section.truncated && <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">Showing a bounded sample. Coverage is incomplete.</p>}
    {section.state === "ready" && !section.rows.length ? <p className={muted}>{empty}</p> : children}
  </section>;
}
function Evidence({ row }: { row: GraphEvidence }) {
  const href = safeSourceUrl(row.source.locator);
  const performance = row.factType === "performance" ? scalarStatistics(row.data).slice(0, 12) : [];
  return <li id={`evidence-${row.id}`} className="space-y-1 border-l-2 border-neutral-300 pl-3 dark:border-neutral-700">
    <p className="break-words">{row.statement}</p>
    <p className={muted}>{row.factType} · {row.status} · {confidenceLabel(row.confidence)}</p>
    <p className={muted}>{row.source.name} / {row.source.provider}{href && <> · <a href={href} target="_blank" rel="noopener noreferrer" className={`underline ${focus}`}>Open source</a></>}</p>
    {row.source.locator && <p className={`${muted} break-all`}>Source locator: {row.source.locator}</p>}
    <p className={`${muted} break-all`}>Source ID: {row.source.id ?? "Unavailable"} · Fetched: {row.source.fetchedAt ?? "Not recorded"}</p>
    {performance.length > 0 && <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 text-sm">{performance.map(([key, value]) => <div key={key} className="contents"><dt className="break-words text-neutral-600 dark:text-neutral-400">{key.replace(/_/g, " ")}</dt><dd className="font-mono">{value}</dd></div>)}</dl>}
  </li>;
}

export function LabView({ result }: { result: LabResult }) {
  const athlete = result.selected;
  const graphComplete = athlete?.intelligenceState === "ready";
  const href = (athleteId: string) => `/admin/intelligence?${new URLSearchParams({ view: "athlete", q: result.query, athlete: athleteId, asOf: result.asOf })}`;
  return <div className="space-y-6 text-neutral-950 dark:text-neutral-50">
    <form action="/admin/intelligence" method="get" role="search" aria-label="Athlete search" className={`${panel} flex flex-wrap items-end gap-3`}>
      <input type="hidden" name="view" value="athlete" />
      <label className="grid min-w-0 flex-1 basis-52 gap-2 text-sm font-medium">Athlete name<input type="search" name="q" defaultValue={result.query} maxLength={120} placeholder="Search canonical athletes" className={`h-11 rounded border border-neutral-300 bg-transparent px-3 dark:border-neutral-700 ${focus}`} /></label>
      <label className="grid gap-2 text-sm font-medium">Evaluation date (UTC)<input type="date" name="asOf" defaultValue={result.asOf} className={`h-11 rounded border border-neutral-300 bg-transparent px-3 dark:border-neutral-700 ${focus}`} /></label>
      {athlete && <input type="hidden" name="athlete" value={athlete.id} />}
      <button className={`h-11 rounded bg-[#ffbb00] px-5 font-semibold text-black ${focus}`} type="submit">Search</button>
    </form>
    <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className={panel} aria-label="Athlete search results"><h2 className="mb-3 font-semibold">Athletes</h2>
        {result.search.state === "unavailable" ? <p role="status" className={muted}>Athlete search is unavailable. Try reloading.</p> : !result.search.rows.length ? <p className={muted}>No canonical athletes match this search.</p> : <ul className="space-y-1">{result.search.rows.map(row => <li key={row.id}><Link href={href(row.id)} aria-current={athlete?.id === row.id ? "page" : undefined} className={`block rounded border-l-2 p-3 ${focus} ${athlete?.id === row.id ? "border-[#ffbb00] bg-neutral-100 dark:bg-neutral-800" : "border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}><span className="block break-words font-medium">{row.name}</span><span className={muted}>{row.school || "School not recorded"}</span></Link></li>)}</ul>}
        {result.search.truncated && <p className={`${muted} mt-4`}>First 25 matches. Refine the athlete name to find more.</p>}
      </aside>
      <div className="min-w-0 space-y-5">
        {!athlete ? <section className={panel}><h2 className="font-semibold">{result.selectionState === "not_found" ? "Athlete not found" : result.selectionState === "invalid" ? "Invalid athlete selection" : "Select an athlete"}</h2><p className={`${muted} mt-2`}>Search and select an existing Athlete Career ID to inspect its graph. No preview or claim records are created here.</p></section> : <>
          <section className={panel} aria-label="Athlete identity"><h2 className="text-2xl font-bold">{athlete.name}</h2><p className={`${muted} mt-1`}>{athlete.position || "Position not recorded"} · {athlete.school || "School label not recorded"} · {athlete.teamLabel || "Team label not recorded"}</p><p className={`${muted} mt-2`}>Identity verification: {athlete.verified === true ? "Verified" : athlete.verified === false ? "Unverified" : "Not recorded"}</p><p className="mt-3 break-all font-mono text-xs">Athlete Career ID: {athlete.id}</p><p className={`${muted} mt-2`}>Current profile labels are context. Dated relationships appear below.</p></section>
          <Section title="Career relationships & timeline" section={athlete.relationships} empty="No normalized roster or career relationships are recorded for this athlete."><ol className="space-y-3">{athlete.relationships.rows.map(row => <li key={row.id} className="border-l-2 border-neutral-300 pl-3 dark:border-neutral-700"><p className="font-medium">{row.team} · {row.season}</p><p className={muted}>{row.organization} · {row.startsOn} → {row.endsOn ?? "End not recorded"} · {row.status}</p></li>)}</ol></Section>
          <Section title="Moments & supporting evidence" section={athlete.moments} empty="No Moments are linked to this athlete. Year-only awards and season statistics do not establish exact-date Moments."><ol className="space-y-6">{athlete.moments.rows.map(moment => <li key={moment.id} id={`moment-${moment.id}`}><h3 className="font-semibold">{moment.title}</h3><p className={muted}>{moment.occurredOn ?? moment.occurredYear ?? "Date unknown"} · {moment.datePrecision} precision · {moment.status} · {confidenceLabel(moment.confidence)}</p><p className={muted}>Athlete relationship: {moment.relationship} · {moment.relationshipStatus} · {confidenceLabel(moment.relationshipConfidence)}</p><p className={`${muted} break-all`}>Moment ID: {moment.id}{moment.eventId && ` · Event ID: ${moment.eventId}`}</p>{moment.evidence.length ? <ul className="mt-3 space-y-4">{moment.evidence.map(row => <Evidence key={row.id} row={row} />)}</ul> : <p className={`${muted} mt-2`}>Supporting evidence is not recorded or could not be loaded.</p>}</li>)}</ol></Section>
          <Section title="Statistics & performance context" section={athlete.statistics} empty="No season statistics are recorded." description="Existing season statistics are shown as context. They are not automatically treated as verified Moment or milestone evidence."><ul className="space-y-5">{athlete.statistics.rows.map(row => <li key={row.id}><h3 className="font-medium">{row.season} · {row.phase} · {row.team || "Team not recorded"}</h3><p className={muted}>Source: {row.source} · {row.model} model</p><dl className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm">{scalarStatistics(row.stats).map(([key, value]) => <div key={key} className="contents"><dt className="break-words text-neutral-600 dark:text-neutral-400">{key.replace(/_/g, " ")}</dt><dd className="font-mono">{value}</dd></div>)}</dl></li>)}</ul></Section>
          <Section title="Connected media metadata" section={athlete.media} empty="No media metadata is linked to this athlete." description="Legacy athlete media records. Moment-to-media linking and usage clearance are not established by these records."><ul className="space-y-3">{athlete.media.rows.map(row => <li key={`${row.model}-${row.id}`}><p className="font-medium">{row.title}</p><p className={muted}>{row.kind} · {row.model} · {row.source || "Source not recorded"}</p></li>)}</ul></Section>
          <ContentEvidence evidence={athlete.evidence.rows} evaluatedAt={result.evaluatedAt ?? `${result.asOf}T23:59:59.999Z`} available={athlete.evidence.state === "ready"} />
          <Section title="Verified external identities" section={athlete.externalIdentities} empty="No verified external provider mapping is recorded."><ul className="space-y-3">{athlete.externalIdentities.rows.map(row => <li key={row.id}><p className="font-medium">{row.provider} · {row.sport} / {row.league}</p><p className="break-all font-mono text-xs">{row.externalId}</p><p className={muted}>{row.method} · {confidenceLabel(row.confidence)} · Verified {row.verifiedAt}</p></li>)}</ul></Section>
          <Section title="Sources & provenance" section={athlete.evidence} empty="No graph evidence is recorded. Legacy context without fact-level provenance remains incomplete."><ul className="space-y-4">{athlete.evidence.rows.filter(row => !row.momentId).map(row => <Evidence key={row.id} row={row} />)}</ul>{athlete.evidence.rows.some(row => row.momentId) && <p className={muted}>Moment evidence and its sources are shown with each Moment above.</p>}</Section>
          <section className={panel} aria-label="Signals"><h2 className="mb-2 text-lg font-semibold">Signals</h2><p className={`${muted} mb-4`}>Evaluated through {result.evaluatedAt ?? result.asOf} UTC. Scores are 0–100 editorial review priority; confidence is separate. Results are computed for review and are not saved.</p>
            {!graphComplete ? <p className={muted}>Signals are unavailable while the supporting graph is incomplete.</p> : !athlete.intelligence.signals.length ? <p className={muted}>No evidence-backed signals satisfy the current rules and evaluation window.</p> : <ul className="space-y-5">{athlete.intelligence.signals.map(signal => <li key={signal.key}><SignalCard signal={signal} /><ul className="mt-2 space-y-1">{signal.evidence.map(evidence => <li key={evidence.id}><Link href={`#evidence-${evidence.id}`} className={`text-sm underline ${focus}`}>{evidence.assertion}</Link></li>)}</ul></li>)}</ul>}
            {athlete.intelligence.skipped.length > 0 && <details className="mt-4 text-sm"><summary className={`cursor-pointer ${focus}`}>Conditions not surfaced ({athlete.intelligence.skipped.length})</summary><ul className="mt-2 space-y-1">{athlete.intelligence.skipped.map((row, index) => <li key={`${row.momentId}-${index}`}>{row.reason}</li>)}</ul></details>}
          </section>
          <section className={panel} aria-label="Opportunities"><h2 className="mb-2 text-lg font-semibold">Opportunities</h2><p className={`${muted} mb-4`}>Potential actions for human research review. Media availability and rights require separate verification.</p>{!athlete.intelligence.opportunities.length ? <p className={muted}>No opportunities have been derived from qualifying signals.</p> : <ul className="space-y-5">{athlete.intelligence.opportunities.map(opportunity => <li key={opportunity.key}><OpportunityCard opportunity={opportunity} athleteName={athlete.name} /></li>)}</ul>}</section>
        </>}
      </div>
    </div>
  </div>;
}
