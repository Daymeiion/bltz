"use client";

import { useRef, useState, type FormEvent } from "react";
import type { IntelligenceOpportunity } from "@/lib/intelligence/signals";
import type { WorkspaceResult } from "@/lib/intelligence/workspace-types";
import { workflowReadSchema, workflowEnvironmentSchema, intendedUses, type WorkflowSummary, type WorkflowCommand, type OpportunityRecord, type ActivationRecord } from "@/lib/intelligence/workflows/contracts";
import styles from "./career-workspace.module.css";

function title(value: string) { return value.replace(/_/g, " "); }
function localDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
export function WorkflowReviewPanel({ data, momentId, onUpdate }: { data: WorkspaceResult; momentId: string | null; onUpdate?: (records: WorkflowSummary) => void }) {
  const [records, setRecords] = useState<WorkflowSummary | null>(data.workflows ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [intendedUse, setIntendedUse] = useState<(typeof intendedUses)[number]>("internal_review");
  const [assetKey, setAssetKey] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [reviewedBlockers, setReviewedBlockers] = useState<Record<string, boolean>>({});
  const [editingDraft, setEditingDraft] = useState<ActivationRecord | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [releaseAt, setReleaseAt] = useState("");
  const pendingCommand = useRef<{ content: string; payload: Record<string, unknown> } | null>(null);
  const [hasPendingCommand, setHasPendingCommand] = useState(false);
  const playerId = data.result.selected?.id;
  const disabled = data.dataMode === "synthetic" || data.workflowState !== "ready" || !records;
  const recordEnvironment=records?.environment??records?.opportunities[0]?.environment;
  const scopeLabel=data.dataMode==="synthetic"?"Fictional synthetic review":recordEnvironment==="production"?"Production review":recordEnvironment==="development"?"Development review":"Internal review";
  async function command(input: Omit<WorkflowCommand, "commandId" | "reason"> | Record<string, unknown>, retryPending = false) {
    if (disabled || !playerId || (!reason.trim() && !(retryPending && pendingCommand.current))) return;
    const proposed = { ...input, reason: reason.trim() };
    const content = JSON.stringify(proposed);
    if (pendingCommand.current && !retryPending && pendingCommand.current.content !== content) {
      setError("A previous save has an unknown result. Retry the pending save or reload before making another change."); return;
    }
    const pending = pendingCommand.current ?? { content, payload: { ...proposed, commandId: crypto.randomUUID() } };
    pendingCommand.current = pending; setHasPendingCommand(true);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/intelligence/workflows", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending.payload) });
      if (!response.ok) {
        if (response.status < 500) { pendingCommand.current = null; setHasPendingCommand(false); }
        const failure = await response.json().catch(() => ({}));
        throw new Error(response.status === 409 ? "This record changed. Reload before reviewing it." : title(failure.error ?? "Workflow could not be saved."));
      }
      const refreshed = await fetch(`/api/admin/intelligence/workflows?${new URLSearchParams({ playerId })}`, { cache: "no-store", credentials: "same-origin" });
      if (!refreshed.ok) throw new Error("Saved, but current review state could not be reloaded. Reload this page.");
      const next = await refreshed.json();
      const parsed = workflowReadSchema.parse({ opportunities: next.opportunities, activations: next.activations, momentAssetLinks: next.momentAssetLinks, history: next.history });
      const scope=workflowEnvironmentSchema.safeParse(next.environment);
      const refreshedRecords: WorkflowSummary = { ...parsed, environment:scope.success?scope.data:records?.environment, truncated: next.truncated === true, measurementState: "unavailable", publishingState: "blocked_adapter_unavailable" };
      setRecords(refreshedRecords); onUpdate?.(refreshedRecords);
      pendingCommand.current = null; setHasPendingCommand(false);
      setDraftFor(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Workflow could not be saved."); }
    finally { setBusy(false); }
  }
  function registerGraph(opportunity: IntelligenceOpportunity) {
    void command({ action: "register_opportunity", opportunityKey: opportunity.key, playerId, momentId: opportunity.momentId,
      runId: null, ruleVersion: "graph-v1", signalKeys: opportunity.signalKeys,
      evidenceIds: opportunity.evidence.map(row => row.id), inputSnapshot: { evaluationDate: data.result.evaluatedAt, opportunity },
      title: title(opportunity.type), explanation: opportunity.explanation, expiresAt: null });
  }
  const known = new Set(records?.opportunities.map(row => row.opportunity_key));
  const graphCandidates = data.result.selected?.intelligence.opportunities.filter(row => (!momentId || row.momentId === momentId) && !known.has(row.key)) ?? [];
  const measuredCandidates = data.measured?.evaluation?.opportunities.filter(row => (!momentId || row.momentId === momentId) && !known.has(row.key)) ?? [];
  const opportunities = records?.opportunities.filter(row => !momentId || row.moment_id === momentId) ?? [];
  const visibleIds = new Set(opportunities.map(row => row.id));
  const activations = records?.activations.filter(row => visibleIds.has(row.opportunity_id)) ?? [];
  const momentEvidence = data.result.selected?.evidence.rows.filter(row => row.momentId === momentId && row.status === "verified") ?? [];
  function linkAsset(event: FormEvent) {
    event.preventDefault();
    const asset = data.media.rows.find(row => `${row.model}:${row.id}` === assetKey);
    if (!asset || !momentId || !evidenceId) return;
    void command({ action: "review_asset_link", playerId, momentId, status: "verified", evidenceIds: [evidenceId],
      legacyMediaId: asset.model === "legacy media" ? asset.id : null, legacyVideoId: asset.model === "legacy video" ? asset.id : null });
  }
  function review(row: OpportunityRecord, state: OpportunityRecord["state"]) {
    void command({ action: "review_opportunity", id: row.id, expectedRevision: row.revision, state,
      ...(state === "ready" && reviewedBlockers[row.id] ? { readinessBlockers: [] } : {}) });
  }
  function transition(row: ActivationRecord, state: ActivationRecord["state"]) {
    void command({ action: "transition_activation", id: row.id, expectedRevision: row.revision, state });
  }
  function createDraft(event: FormEvent) {
    event.preventDefault();
    void command({ action: editingDraft ? "edit_activation" : "create_activation",
      ...(editingDraft ? { id: editingDraft.id, expectedRevision: editingDraft.revision, assetLinkIds: selectedLinks } : { opportunityId: draftFor }), title: draftTitle, description,
      proposedBrands: brand.split(",").map(name => name.trim()).filter(Boolean).map(name => ({ name, status: "proposed" })), intendedUse,
      releaseAt: editingDraft && releaseAt === localDateInput(editingDraft.release_at) ? editingDraft.release_at : releaseAt ? new Date(releaseAt).toISOString() : null });
  }
  return <>
    <section className={styles.railSection} aria-label="Opportunity review queue">
      <div className={styles.railHeading}><h2>Review queue</h2><span>{records ? opportunities.length : "Unavailable"}</span></div>
      <p className={styles.railNote}>{scopeLabel}. Decisions and drafts persist; proposals do not authorize publication.</p>
      {disabled && <p className={styles.railEmpty}>{data.dataMode === "synthetic" ? "Synthetic examples never write to live workflows." : "Review storage is disabled or unavailable."}</p>}
      {!disabled && <label className={styles.railNote}>Review reason<textarea aria-label="Review reason" maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} /></label>}
      {error && <p role="alert" className={styles.railNote}>{error}</p>}
      {hasPendingCommand && !busy && <button className={styles.cardAction} onClick={() => void command({}, true)}>Retry pending save</button>}
      <ul className={styles.railList}>
        {!disabled && graphCandidates.map(row => <li key={row.key}><details className={styles.railCard}><summary><strong>{title(row.type)}</strong></summary><div className={styles.railContent}><p>{row.explanation}</p><button className={styles.cardAction} disabled={busy || !reason.trim()} onClick={() => registerGraph(row)}>Save for review</button></div></details></li>)}
        {!disabled && measuredCandidates.map(row => <li key={row.key}><details className={styles.railCard}><summary><strong>{title(row.type)}</strong></summary><div className={styles.railContent}><p>{row.blockers.map(title).join(", ")}</p><button className={styles.cardAction} disabled={busy || !reason.trim()} onClick={() => void command({ action: "register_opportunity", opportunityKey: row.key, playerId: row.playerId, momentId: row.momentId,
          runId: data.measured?.snapshot?.provenance.runId, ruleVersion: "measured-v1", signalKeys: row.signalKeys, evidenceIds: [],
          inputSnapshot: { opportunity: row, featureRunId: data.measured?.snapshot?.provenance.runId }, title: title(row.type), explanation: `Measured condition requires review: ${row.blockers.map(title).join(", ")}`, expiresAt: null })}>Save for review</button></div></details></li>)}
        {opportunities.map(row => <li key={row.id}><details className={styles.railCard}><summary><span><strong>{row.title}</strong><small>{title(row.state)} · revision {row.revision}</small></span></summary><div className={styles.railContent}><p>{row.explanation}</p><p>Assignee: {row.assignee_id ?? "Unassigned"}. Blockers: {row.readiness_blockers.map(title).join(", ") || "No recorded blockers"}.</p>
          <p>Expires: {row.expires_at ?? "Not set"}. Updated: {row.updated_at}.</p>
          {!disabled && !["dismissed", "expired", "accepted"].includes(row.state) && <><label><input type="checkbox" aria-label="I reviewed the readiness blockers" checked={reviewedBlockers[row.id] === true} onChange={event => setReviewedBlockers(current => ({ ...current, [row.id]: event.target.checked }))} />I reviewed the readiness blockers</label><p>Clearing research blockers does not grant media rights or publication approval.</p><button className={styles.cardAction} disabled={busy || !reason.trim()} onClick={() => review(row, "in_review")}>Review</button><button className={styles.cardAction} disabled={busy || !reason.trim() || !reviewedBlockers[row.id]} onClick={() => review(row, "ready")}>Mark ready</button><button className={styles.cardAction} disabled={busy || !reason.trim() || row.state !== "ready"} onClick={() => review(row, "accepted")}>Accept opportunity</button><button className={styles.cardAction} disabled={busy || !reason.trim()} onClick={() => review(row, "dismissed")}>Dismiss</button></>}
          {!disabled && row.state === "accepted" && <button className={styles.cardAction} onClick={() => { setDraftFor(row.id); setEditingDraft(null); setDraftTitle(row.title); setDescription(""); setBrand(""); setReleaseAt(""); setSelectedLinks([]); }}>Create activation draft</button>}
        </div></details></li>)}
      </ul>
      {draftFor && <form className={styles.railContent} aria-label="Activation draft" onSubmit={createDraft}>
        <label>Title<input required maxLength={400} value={draftTitle} onChange={event => setDraftTitle(event.target.value)} /></label>
        <label>Description<textarea required maxLength={4000} value={description} onChange={event => setDescription(event.target.value)} /></label>
        <label>Proposed brands (comma separated)<input maxLength={960} value={brand} onChange={event => setBrand(event.target.value)} /></label>
        <label>Intended use<select value={intendedUse} onChange={event => setIntendedUse(event.target.value as typeof intendedUse)}>{intendedUses.map(use => <option key={use} value={use}>{title(use)}</option>)}</select></label>
        <label>Planned release (local time)<input type="datetime-local" value={releaseAt} onChange={event => setReleaseAt(event.target.value)} /></label>
        {editingDraft && <fieldset><legend>Reviewed assets</legend>{records?.momentAssetLinks.filter(link => link.status === "verified" && link.current_display_eligible && link.player_id === playerId && (!records.opportunities.find(opportunity => opportunity.id === editingDraft.opportunity_id)?.moment_id || link.moment_id === records.opportunities.find(opportunity => opportunity.id === editingDraft.opportunity_id)?.moment_id)).map(link => <label key={link.id}><input type="checkbox" checked={selectedLinks.includes(link.id)} onChange={event => setSelectedLinks(current => event.target.checked ? [...current, link.id] : current.filter(id => id !== link.id))} />{link.legacy_media_id ?? link.legacy_video_id}</label>)}</fieldset>}
        <p>Proposed brands are not partners. Release dates and publication remain blocked until approved adapters exist.</p>
        <button className={styles.cardAction} disabled={busy || !reason.trim()} type="submit">Save activation draft</button><button className={styles.cardAction} type="button" onClick={() => { setDraftFor(null); setEditingDraft(null); }}>Cancel</button>
      </form>}
      {records?.truncated && <p className={styles.railNote}>Review history is bounded; some records are not shown.</p>}
      {!disabled && momentId && <form className={styles.railContent} aria-label="Review Moment asset association" onSubmit={linkAsset}>
        <h3>Review Moment asset association</h3><p>Confirm this exact asset depicts this Moment using reviewed evidence. Athlete appearance alone does not establish contribution or rights.</p>
        <label>Exact legacy asset<select required value={assetKey} onChange={event => setAssetKey(event.target.value)}><option value="">Select an asset</option>{data.media.rows.map(row => <option key={`${row.model}:${row.id}`} value={`${row.model}:${row.id}`}>{row.title} · {row.model} · {row.id}</option>)}</select></label>
        <label>Verified Moment evidence<select required value={evidenceId} onChange={event => setEvidenceId(event.target.value)}><option value="">Select evidence</option>{momentEvidence.map(row => <option key={row.id} value={row.id}>{row.statement}</option>)}</select></label>
        <button type="submit" className={styles.cardAction} disabled={busy || !reason.trim() || !assetKey || !evidenceId}>Save reviewed association</button>
        {records?.momentAssetLinks.filter(row => row.moment_id === momentId).map(row => <p key={row.id}>{row.legacy_media_id ?? row.legacy_video_id} · {row.status} · display {row.current_display_eligible ? "eligible" : "withheld"}<button className={styles.cardAction} type="button" disabled={busy || !reason.trim() || row.status === "rejected"} onClick={() => void command({ action: "review_asset_link", id: row.id, expectedRevision: row.revision, playerId, momentId, status: "rejected", legacyMediaId: row.legacy_media_id, legacyVideoId: row.legacy_video_id, evidenceIds: row.evidence_ids })}>Reject association</button></p>)}
      </form>}
    </section>
    <section className={styles.railSection} aria-label="Activations"><div className={styles.railHeading}><h2>Activations</h2><span>{records ? activations.length : "Unavailable"}</span></div>
      {!activations.length && <p className={styles.railEmpty}>{records ? "No activation drafts recorded." : "Activation records unavailable."}</p>}
      <ul className={styles.railList}>{activations.map(row => <li key={row.id}><details className={styles.railCard}><summary><span><strong>{row.title}</strong><small>{title(row.state)} · revision {row.revision}</small></span></summary><div className={styles.railContent}><p>{row.description}</p><p>Proposed brands: {row.proposed_brands.map(item => item.name).join(", ") || "None"}.</p><p>Intended use: {title(row.intended_use)}. Release: {row.release_at ?? "Not scheduled"}.</p><p>Reach and revenue: unavailable. Publication blocked pending rights and publishing adapters.</p><p>Media review: {row.current_media_review_valid ? "Current; intended-use clearance still required" : "Missing or stale"}.</p>
        {!disabled && row.state !== "cancelled" && <><button className={styles.cardAction} onClick={() => { setEditingDraft(row); setDraftFor(row.opportunity_id); setDraftTitle(row.title); setDescription(row.description); setBrand(row.proposed_brands.map(item => item.name).join(", ")); setIntendedUse(row.intended_use); setReleaseAt(localDateInput(row.release_at)); setSelectedLinks(row.asset_link_ids); }}>Edit draft and assets</button><button className={styles.cardAction} disabled={busy || !reason.trim() || !row.asset_link_ids.length || row.asset_link_ids.some(id => !records?.momentAssetLinks.some(link => link.id === id && link.status === "verified" && link.current_display_eligible))} onClick={() => transition(row, "awaiting_approvals")}>Request review</button><button className={styles.cardAction} disabled={busy || !reason.trim()} onClick={() => transition(row, "paused")}>Pause</button><button className={styles.cardAction} disabled={busy || !reason.trim()} onClick={() => transition(row, "cancelled")}>Cancel draft</button></>}
        <details className={styles.disclosure}><summary>Review history</summary>{records?.history.filter(item => item.activation_id === row.id).map(item => <p key={item.id}>{item.created_at} · {title(item.action)} · {item.reason}</p>)}</details>
      </div></details></li>)}</ul>
    </section>
  </>;
}
