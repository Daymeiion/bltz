"use client";
import type { FeatureMetric, MeasuredIntelligenceSignal, IntelligenceFeatureSnapshot } from "@/lib/intelligence/features";
import styles from "./career-workspace.module.css";

export function metricLabel(metric:FeatureMetric|undefined):string {
  if(!metric||metric.value===null)return metric?.state?.replace(/_/g," ")??"Unavailable";
  return `${metric.value.toLocaleString()}${metric.state==="observed"?"":` · ${metric.state.replace(/_/g," ")}`}`;
}
export function MeasuredIntelligence({data,label,onRefresh,busy=false}:{data:{environment?:"development"|"production"|"synthetic"|null;reason:string|null;snapshot:Omit<IntelligenceFeatureSnapshot,"environment">|null;refreshAllowed?:boolean}|undefined;label?:string;onRefresh?:()=>void;busy?:boolean}){
  const snapshot=data?.snapshot;
  const scopeLabel=data?.environment==="production"?"Production measurements":data?.environment==="development"?"Development measurements":data?.environment==="synthetic"?"Fictional synthetic measurements":"Measurements";
  const refreshLabel=data?.environment==="production"?"Refresh production measurements":data?.environment==="development"?"Refresh development measurements":"Refresh measurements";
  return <section className={styles.section} aria-label="Discovery and engagement"><h3>Discovery &amp; engagement</h3>
    <p className={styles.sectionDescription}>{label??scopeLabel} · tab sessions, not people. These do not establish rights, revenue or returning visitors.</p>
    {onRefresh && data?.refreshAllowed && data.environment!=="synthetic" && <button className={styles.cardAction} type="button" disabled={busy} onClick={onRefresh}>{busy?"Refreshing measurements…":refreshLabel}</button>}
    {!snapshot?<p className={styles.railEmpty}>{data?.reason??"Measurements unavailable; no verified analytics snapshot exists."}</p>:<>
      <dl className={styles.statistics}>
        <div><dt>Locker opens</dt><dd>{metricLabel(snapshot.current.metrics.lockerOpens)}</dd></div>
        <div><dt>Eligible tab sessions</dt><dd>{metricLabel(snapshot.current.metrics.eligibleDistinctSessions)}</dd></div>
        <div><dt>Qualified sessions</dt><dd>{metricLabel(snapshot.current.metrics.qualifiedSessions)}</dd></div>
        <div><dt>Media opens</dt><dd>{metricLabel(snapshot.current.metrics.mediaOpens)}</dd></div>
        <div><dt>Share intents</dt><dd>{metricLabel(snapshot.current.metrics.shareIntents)}</dd></div>
        <div><dt>Video completions</dt><dd>{metricLabel(snapshot.current.metrics.videoCompletions)}</dd></div>
      </dl>
      <details className={styles.disclosure}><summary>Measurement definitions &amp; provenance</summary>
        <p>Half-open window: {snapshot.current.window.start} → {snapshot.current.window.end}. Baseline: {snapshot.baseline.window.start} → {snapshot.baseline.window.end}.</p>
        <p>Coverage: {snapshot.current.coverage.state}; fraction {snapshot.current.coverage.fraction===null?"unknown":`${Math.round(snapshot.current.coverage.fraction*100)}%`}. Quality: {snapshot.quality.state}. Logical events: {snapshot.quality.logicalEventCount}.</p>
        <p>Qualified: {snapshot.current.metrics.qualifiedSessions.definition}</p><p>Media opens: {snapshot.current.metrics.mediaOpens.definition}</p>
        <p>As of {snapshot.provenance.asOf}; delivery watermark {snapshot.provenance.eventWatermark}; version {snapshot.featureVersion}; run {snapshot.provenance.runId}.</p>
        <p>Growth: {snapshot.comparisons.lockerSessions.growthFraction===null?snapshot.comparisons.lockerSessions.activity.replace(/_/g," "):`${Math.round(snapshot.comparisons.lockerSessions.growthFraction*100)}%`}. Suppressed: {snapshot.comparisons.lockerSessions.suppressionReasons.join(", ")||"none"}.</p>
      </details>
    </>}
  </section>;
}
export function MeasuredSignalCard({signal}:{signal:Omit<MeasuredIntelligenceSignal,"environment">}){
  return <details className={styles.railCard}><summary><span><small>{signal.type.replace(/_/g," ")}</small><strong>Measured {signal.subject.kind} condition</strong><small>{signal.measurementQuality.state} · {signal.commercialReadiness==="not_applicable"?"operational review":"research needed"}</small></span></summary>
    <div className={styles.railContent}><p>{signal.explanation}</p><p>Editorial priority: {signal.editorialPriority}/100. Evidence confidence: not inferred from traffic.</p>
      <p>Window: {signal.evaluationWindow.start} → {signal.evaluationWindow.end}. Sample: {signal.measurementQuality.sampleSize}.</p>
      <p>Current: {signal.trigger.current??"unknown"}; baseline: {signal.trigger.baseline??"unknown"}; growth: {signal.trigger.growthFraction===null?"unknown":`${Math.round(signal.trigger.growthFraction*100)}%`}.</p>
      <details className={styles.disclosure}><summary>Rule &amp; feature lineage</summary><p>{signal.ruleVersion}; feature run {signal.lineage.runId}; input {signal.lineage.inputSnapshotHash}.</p></details>
    </div></details>;
}
