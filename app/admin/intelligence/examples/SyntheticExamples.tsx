"use client";

import { useState } from "react";
import type { SyntheticWorkflowExample } from "@/lib/intelligence/features/examples";
import { MeasuredIntelligence, MeasuredSignalCard } from "../MeasuredIntelligence";
import careerStyles from "../career-workspace.module.css";
import styles from "./examples.module.css";

function fieldLabel(value: string) { return value.replace(/_/g, " "); }
function displayValue(value: SyntheticWorkflowExample["outcome"][string]): string {
  if (value === null) return "Not established";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString("en-US");
  return Array.isArray(value) ? value.map(fieldLabel).join(", ") : fieldLabel(value);
}

/** Local selection only: no requests, storage, live ranking or write controls. */
export function SyntheticExamples({ examples }: { examples: SyntheticWorkflowExample[] }) {
  const [selectedId, setSelectedId] = useState<string>(examples[0]?.id ?? "");
  const selected = examples.find(example => example.id === selectedId);
  return <main className={`${careerStyles.workspace} ${styles.examples}`}>
    <div className={styles.banner} role="note" aria-label="Synthetic isolation notice">
      <strong>Synthetic example · development only</strong>
      <p>These identities and outcomes are fictional. No live counts, partner reports, rankings, events, financial allocations or payouts are changed.</p>
    </div>
    <header className={styles.header}><div><p className={careerStyles.eyebrow}>BLTZ Intelligence Lab</p><h1>Synthetic workflow examples</h1></div><a className={styles.back} href="/admin/intelligence">Return to live Lab</a></header>
    <div className={styles.selector}><label htmlFor="synthetic-scenario">Workflow scenario</label><select id="synthetic-scenario" value={selectedId} onChange={event => setSelectedId(event.target.value)}>{examples.map(example => <option key={example.id} value={example.id}>{example.title}</option>)}</select></div>
    {!selected ? <p className={careerStyles.empty}>No synthetic examples supplied.</p> : <article key={selected.id} aria-labelledby="scenario-title">
      <header className={styles.scenarioHeader}><h2 id="scenario-title">{selected.title}</h2><p>{selected.description}</p><p className={styles.metadata}>{selected.athleteName} · {selected.organizationName} · as of {selected.asOf}</p></header>
      <div className={styles.columns}>
        <div className={styles.content}>
          {selected.snapshot && <MeasuredIntelligence data={{ snapshot: selected.snapshot, reason: null }} label="Synthetic measurements" />}
          <section className={careerStyles.section} aria-label="Executed results"><h3>Executed results</h3><p className={careerStyles.sectionDescription}>Values below come from this isolated fixture. Financial amounts, where present, are cents in a local arithmetic simulation.</p><dl className={careerStyles.statistics}>{Object.entries(selected.outcome).map(([name, value]) => <div key={name}><dt>{fieldLabel(name)}</dt><dd>{displayValue(value)}</dd></div>)}</dl></section>
          {selected.activation && <section className={careerStyles.section} aria-label="Synthetic activation"><h3>Read-only activation illustration</h3><p className={careerStyles.sectionDescription}>{selected.activation.title}. This is not a saved activation.</p><dl className={careerStyles.statistics}><div><dt>State</dt><dd>{selected.activation.state === "expected_paused" ? "Pause expected; not executed" : "Local draft"}</dd></div><div><dt>Brand</dt><dd>{selected.activation.proposedBrands.map(brand => `${brand.name} · proposed`).join(", ")}</dd></div><div><dt>Reach / impressions</dt><dd>Not established</dd></div><div><dt>Publishing permitted</dt><dd>No</dd></div></dl></section>}
          <section className={careerStyles.section} aria-label="Fixture checks"><h3>Fixture checks</h3><p className={careerStyles.sectionDescription}>A contract expectation describes required future integration behavior; it is not an executed test.</p><div className={styles.tableScroll}><table className={styles.checks}><caption className={careerStyles.srOnly}>Expected and actual results for {selected.title}</caption><thead><tr><th scope="col">Condition</th><th scope="col">Expected</th><th scope="col">Actual</th><th scope="col">Result / basis</th></tr></thead><tbody>{selected.checks.map(check => <tr key={check.name}><th scope="row">{fieldLabel(check.name)}</th><td>{displayValue(check.expected)}</td><td>{check.basis === "contract_expectation" && check.actual === null ? "Not executed" : displayValue(check.actual)}</td><td><strong>{check.passed === null ? "Contract expectation" : check.passed ? "Passed" : "Failed"}</strong><br />{fieldLabel(check.basis)}</td></tr>)}</tbody></table></div></section>
        </div>
        <aside className={careerStyles.rail} aria-label="Synthetic signals and assumptions">
          <section className={careerStyles.railSection} aria-label="Synthetic signals"><div className={careerStyles.railHeading}><h2>Read-only signals</h2></div><div className={careerStyles.railList}>
            {selected.evaluation?.signals.map(signal => <MeasuredSignalCard key={signal.key} signal={signal} />)}
            {selected.careerEvaluation?.signals.map(signal => <details key={signal.key} className={careerStyles.railCard}><summary><span><small>{fieldLabel(signal.type)}</small><strong>Synthetic career condition</strong><small>{signal.status} · research needed</small></span></summary><div className={careerStyles.railContent}><p>{signal.explanation}</p><p>Editorial priority: {signal.score}/100. Evidence confidence: {signal.confidence === null ? "Not established" : `${Math.round(signal.confidence * 100)}% from supplied synthetic evidence`}.</p><p>Rule {signal.ruleVersion}; target {signal.targetDate ?? "Not established"}.</p></div></details>)}
            {!selected.evaluation?.signals.length && !selected.careerEvaluation?.signals.length && <p className={careerStyles.railEmpty}>No signal emitted by this scenario.</p>}
          </div></section>
          <section className={careerStyles.railSection} aria-label="Fixture assumptions"><div className={careerStyles.railHeading}><h2>Assumptions &amp; limits</h2></div><ul className={styles.assumptions}>{selected.assumptions.map(assumption => <li key={assumption}>{assumption}</li>)}</ul><details className={careerStyles.disclosure}><summary>Isolation contract</summary><p className={careerStyles.railNote}>Namespace: {selected.subjectNamespace}. Persistence permitted: no. Excluded from {selected.excludeFrom.map(fieldLabel).join(", ")}.</p></details></section>
        </aside>
      </div>
    </article>}
  </main>;
}
