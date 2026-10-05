import Link from "next/link";
import { intelligenceDisplayExample } from "@/lib/intelligence/display-example";
import { SignalCard, OpportunityCard } from "./IntelligenceCards";
import styles from "./intelligence.module.css";

export function DisplayExample() {
  const example = intelligenceDisplayExample();
  const signal = example.evaluation.signals[0];
  const opportunity = example.evaluation.opportunities[0];
  return <div className={styles.research}>
    <div className={styles.exampleNotice} role="note"><strong>Illustrative example — not live athlete data</strong><p>This fictional case demonstrates the display. Its athlete, Moment, source and confidence are synthetic. It does not create records, affect research counts, or describe a real athlete.</p></div>
    <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>A traceable intelligence brief</span><h2>One Moment. A reason to revisit it.</h2></div><Link href="/admin/intelligence?view=athlete" className={styles.textLink}>Explore real athlete records ↗</Link></div>
    <ol className={styles.evidenceChain} aria-label="Illustrative intelligence chain">{["Athlete identity", "Career Moment", "Source evidence", "Detected signal", "Potential opportunity"].map((label, index) => <li key={label}><span>{String(index + 1).padStart(2, "0")}</span>{label}</li>)}</ol>
    <div className={styles.caseGrid}><section className={styles.caseIdentity} aria-label="Illustrative athlete and Moment"><span className={styles.eyebrow}>{example.athlete.label}</span><h2>{example.athlete.name}</h2><p className={styles.caseAffiliation}>{example.athlete.affiliation}<br />{example.athlete.sport}</p><div className={styles.caseMoment}><span className={styles.eyebrow}>Illustrative Moment / October 13, 2006</span><h3>{example.moment.title}</h3><p>{example.moment.summary}</p></div><dl className={styles.caseDetails}><div><dt>Date precision</dt><dd>Exact day</dd></div><div><dt>Evaluation date</dt><dd>September 30, 2026</dd></div><div><dt>Media relationship</dt><dd>Not established</dd></div><div><dt>Usage clearance</dt><dd>Not established</dd></div></dl></section><div className={styles.caseResults}><SignalCard signal={signal} example /><OpportunityCard opportunity={opportunity} athleteName={`${example.athlete.name} · fictional`} example /></div></div>
    <section className={styles.evidencePanel} aria-label="Illustrative supporting evidence"><div><span className={styles.eyebrow}>Why this condition is surfaced</span><h2>Follow the evidence</h2><p>The 20-year anniversary is 13 days away at the fixed example evaluation date. The score comes from the same deterministic anniversary rule used by the athlete explorer.</p></div><div><h3>Illustrative university archive</h3><blockquote>{signal.evidence[0].assertion}</blockquote><dl className={styles.caseDetails}><div><dt>Sample provenance</dt><dd>Manual archive observation</dd></div><div><dt>Sample fetched date</dt><dd>September 29, 2026</dd></div><div><dt>Sample confidence</dt><dd>92% on a 0–100 scale</dd></div></dl><p className={styles.note}>No real source URL is asserted. Live briefs retain canonical source and Moment IDs and link back to supporting records.</p></div></section>
  </div>;
}
