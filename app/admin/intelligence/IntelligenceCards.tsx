import Link from "next/link";
import type { IntelligenceOpportunity, IntelligenceSignal } from "@/lib/intelligence/signals";
import { confidenceLabel } from "@/lib/intelligence/lab-format";
import styles from "./intelligence.module.css";

export function SignalCard({ signal, example = false }: { signal: IntelligenceSignal; example?: boolean }) {
  return <article className={styles.signalCard} id={example ? undefined : `signal-${signal.key}`} aria-label={`${example ? "Illustrative " : ""}signal`}>
    <div className={styles.cardTop}><span className={styles.eyebrow}>{example ? "Illustrative signal" : "Detected condition"}</span><span className={styles.score}>{signal.score}<small>/100</small></span></div>
    <h3>{signal.type === "historical_anniversary" ? "Historical anniversary" : "Career milestone"}</h3>
    <p>{signal.explanation}</p>
    <div className={styles.cardMeta}><span>{confidenceLabel(signal.confidence)}</span><span>Rule {signal.ruleVersion}</span><span>Target {signal.targetDate}</span></div>
    <p className={styles.note}>Score measures editorial review priority. It is not probability, earnings or monetary value.</p>
    {!example && <Link href={`#moment-${signal.momentId}`} className={styles.textLink}>Inspect supporting Moment ↗</Link>}
  </article>;
}

export function OpportunityCard({ opportunity, athleteName, example = false }: { opportunity: IntelligenceOpportunity; athleteName: string; example?: boolean }) {
  return <article className={styles.opportunityCard} aria-label={`${example ? "Illustrative " : ""}opportunity`}>
    <div className={styles.cardTop}><span className={styles.eyebrow}>{example ? "Illustrative opportunity" : "Potential action"}</span><span className={styles.reviewLabel}>Human review</span></div>
    <h3>{opportunity.type === "anniversary_retrospective_review" ? "Alumni retrospective" : "Career milestone feature"}</h3>
    <p>{opportunity.explanation}</p>
    <div className={styles.cardMeta}><span>{athleteName}</span><span>Signal strength {opportunity.strength}/100</span><span>{confidenceLabel(opportunity.confidence)}</span></div>
    <div className={styles.assetGap}><strong>Evidence still needed</strong><p>Verified Moment-to-media links, usage clearance, and athlete preferences before an activation is proposed.</p></div>
    {!example && <div className={styles.linkRow}><Link href={`#moment-${opportunity.momentId}`} className={styles.textLink}>Supporting Moment ↗</Link>{opportunity.signalKeys.map(key => <Link key={key} href={`#signal-${key}`} className={styles.textLink}>Originating signal ↗</Link>)}</div>}
  </article>;
}
