import { ArrowRight, Download } from "lucide-react";
import content from "./meeting-content.json";
import styles from "./meeting.module.css";

function DocumentHeader({ workflow = false }: { workflow?: boolean }) {
  return <header className={styles.documentHeader}>
    <div><p className={styles.eyebrow}>BLTZ × Getty Images / Discussion proposal</p>
      <h1>{workflow ? content.workflowTitle : content.title}</h1>
      <p className={styles.thesis}>{content.thesis}</p></div>
    <a className={styles.download} href={`/admin/getty-partnership/download?document=${workflow ? "workflow" : "one-sheet"}`}>
      <Download size={16} aria-hidden="true" /> Download PDF
    </a>
  </header>;
}

function Flow({ steps }: { steps: string[] }) {
  return <ol className={styles.flow}>{steps.map((step, index) => <li key={step}>
    <span>{step}</span>{index < steps.length - 1 && <ArrowRight aria-hidden="true" size={16} />}
  </li>)}</ol>;
}

export function OneSheet() {
  return <div className={styles.canvas}><article className={styles.paper} aria-label="Getty pilot visual one-sheet">
    <DocumentHeader />
    <div className={styles.thesisFlow}><Flow steps={content.flow} /></div>
    <section aria-labelledby="uses-heading">
      <h2 id="uses-heading" className={styles.sectionHeading}>Three proposed uses / Who buys / How Getty earns</h2>
      <div className={styles.useRows}>{content.uses.map(use => <div key={use.id} className={styles.useRow}>
        <div className={styles.useTitle}><span>{use.id}</span><h3>{use.title}</h3></div>
        <div className={styles.useJourney}><Flow steps={use.steps} /><p><strong>Potential buyer</strong> {use.buyer}</p></div>
        <p className={styles.revenue}>{use.revenue}</p>
      </div>)}</div>
    </section>
    <section className={styles.pilot} aria-labelledby="pilot-heading">
      <div className={styles.pilotIntro}><div><h2 id="pilot-heading">{content.pilot.title}</h2><p className={styles.scope}>{content.pilot.scope}</p></div><p>{content.pilot.boundary}</p></div>
      <p className={styles.stages}>{content.pilot.stages}</p>
      <div className={styles.metrics}>{content.pilot.metrics.map(metric => <div key={metric.label}><h3>{metric.label}</h3><p>{metric.value}</p></div>)}</div>
      <p className={styles.measureNote}>Agree baselines, targets and reporting access before launch. Exposure is measured separately from paid outcomes.</p>
    </section>
    <section aria-labelledby="quotes-heading" className={styles.quotes}>
      <h2 id="quotes-heading" className={styles.sectionHeading}>Player voices / To gather before the follow-up</h2>
      <div className={styles.quoteGrid}>{content.quotes.map(label => <div className={styles.quote} key={label}>
        <h3>{label}</h3><div aria-hidden="true" className={styles.quoteLines} /><p>Quote to add · Name / project / permission to quote</p>
      </div>)}</div>
    </section>
    <footer className={styles.note}>{content.note}</footer>
  </article></div>;
}

export function ImageWorkflow() {
  return <div className={styles.canvas}><article className={styles.paper} aria-label="Getty image use and revenue workflow">
    <DocumentHeader workflow />
    <ol className={styles.workflowSteps}>{content.workflowSteps.map((step, index) => <li key={step.title}>
      <span className={styles.stepNumber}>0{index + 1}</span><h2>{step.title}</h2><p>{step.body}</p>
    </li>)}</ol>
    <section aria-labelledby="workflow-uses-heading"><h2 id="workflow-uses-heading" className={styles.sectionHeading}>One image / Three possible briefs</h2>
      <div className={styles.detailRows}>{content.uses.map(use => <section key={use.id} className={styles.detailRow} aria-labelledby={`workflow-${use.id}`}>
        <div className={styles.detailTitle}><span>{use.id}</span><h3 id={`workflow-${use.id}`}>{use.title}</h3><p>{use.example}</p><p><strong>Potential buyer</strong><br />{use.buyer}</p></div>
        <div><h4>License brief + approval</h4><p>{use.approval}</p><h4>Getty revenue</h4><p>{use.revenue}</p></div>
        <div><h4>Attribution + tracking</h4><p>{use.track}</p></div>
      </section>)}</div>
    </section>
    <section className={styles.responsibilities} aria-label="Pilot responsibilities"><h2>What the pilot asks of each side</h2><p>{content.pilot.getty}</p><p>{content.pilot.bltz}</p></section>
    <footer className={styles.note}>{content.note}</footer>
  </article></div>;
}
