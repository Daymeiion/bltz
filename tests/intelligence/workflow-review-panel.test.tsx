import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkflowReviewPanel } from "@/app/admin/intelligence/WorkflowReviewPanel";
import { intelligenceDisplayExample } from "@/lib/intelligence/display-example";
import type { WorkspaceResult } from "@/lib/intelligence/workspace-types";
import { workflowCommandSchema, type WorkflowCommand, type WorkflowSummary, type OpportunityRecord } from "@/lib/intelligence/workflows/contracts";

// Fictional supplied DTOs exercise actual DOM events and request serialization.
// Persistence/security/rights semantics are separately executed in PGlite/API tests.
const example = intelligenceDisplayExample();
const candidate = example.evaluation.opportunities[0];
const playerId = candidate.playerId;
const opportunityId = "00000000-0000-4000-8000-000000000201";
const activationId = "00000000-0000-4000-8000-000000000202";
const actorId = "00000000-0000-4000-8000-000000000203";
const assetId = "00000000-0000-4000-8000-000000000204";
const linkId = "00000000-0000-4000-8000-000000000205";
const unrelatedMomentId = "00000000-0000-4000-8000-000000000206";
const unrelatedAssetId = "00000000-0000-4000-8000-000000000207";
const updatedAt = "2026-10-05T20:00:00.000Z";
function emptyStore(): WorkflowSummary { return { opportunities: [], activations: [], momentAssetLinks: [], history: [], measurementState: "unavailable", publishingState: "blocked_adapter_unavailable", truncated: false }; }
function record(state: OpportunityRecord["state"] = "candidate"): OpportunityRecord {
  return { id: opportunityId, environment: "development", opportunity_key: candidate.key, player_id: playerId, moment_id: candidate.momentId,
    run_id: null, rule_version: "graph-v1", signal_keys: candidate.signalKeys, evidence_ids: candidate.evidence.map(row => row.id),
    title: "anniversary retrospective review", explanation: candidate.explanation, state,
    readiness_blockers: state === "candidate" ? ["permissions_and_measurement_review_required"] : [],
    assignee_id: null, expires_at: null, revision: 1, updated_at: updatedAt };
}
function fixture(workflows = emptyStore()): WorkspaceResult {
  const section = <T,>(rows: T[] = []) => ({ state: "ready" as const, rows, truncated: false });
  return { result: { query: "", asOf: "2026-09-30", evaluatedAt: "2026-09-30T23:59:59.999Z", search: section(), selectionState: "ready",
    selected: { id: playerId, name: "Fictional Athlete", slug: "fictional-athlete", school: null, position: null, teamLabel: null, verified: null,
      relationships: section(), statistics: section(), media: section(), externalIdentities: section(), moments: section(), evidence: section(),
      intelligenceState: "ready", intelligence: example.evaluation } },
    directory: section(), profile: null, profileState: "ready", media: section(), mediaPreviewState: "ready", content: section(), momentMediaState: "ready",
    workflows, workflowState: "ready", dataMode: "live" };
}
let host: HTMLDivElement;
let root: Root;
let stored: WorkflowSummary;
let commands: WorkflowCommand[];
const updated = vi.fn();
let conflict = false;
let failRefresh = false;
let loseCreateResponse = false;
let createdDrafts = 0;
let seenBodies: Map<string, string>;
let api = vi.fn(mockPersistence);
function button(label: string) { return [...host.querySelectorAll("button")].find(row => row.textContent?.trim() === label) ?? null; }
function control(label: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const input = host.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[aria-label="${label}"]`)
    ?? [...host.querySelectorAll("label")].find(row => row.textContent?.startsWith(label))?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input,textarea,select");
  expect(input).toBeTruthy(); return input!;
}
async function fill(label: string, value: string) {
  await act(async () => {
    const element = control(label);
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}
async function click(label: string) {
  const target = button(label); expect(target).toBeTruthy();
  await act(async () => target!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}
async function render(data = fixture(structuredClone(stored))) { await act(async () => root.render(<WorkflowReviewPanel data={data} momentId={null} onUpdate={updated} />)); }
function mockPersistence(url: string | URL | Request, init?: RequestInit) {
  const path = String(url);
  if (init?.method !== "POST") {
    expect(path).toContain(`playerId=${playerId}`);
    return Promise.resolve(Response.json(failRefresh ? { error: "unavailable" } : stored, { status: failRefresh ? 503 : 200 }));
  }
  const command = workflowCommandSchema.parse(JSON.parse(String(init.body)));
  commands.push(command);
  if (conflict) return Promise.resolve(Response.json({ error: "revision_conflict" }, { status: 409 }));
  const prior = seenBodies.get(command.commandId);
  if (prior) {
    expect(String(init.body)).toBe(prior);
    return Promise.resolve(Response.json({ record: { id: activationId, revision: 1 }, duplicate: true }));
  }
  if (command.action === "register_opportunity") stored.opportunities = [record()];
  if (command.action === "review_opportunity") {
    const old = stored.opportunities[0];
    expect(command.expectedRevision).toBe(old.revision);
    stored.opportunities = [{ ...old, state: command.state, readiness_blockers: command.readinessBlockers ?? old.readiness_blockers, revision: old.revision + 1 }];
  }
  if (command.action === "create_activation") {
    createdDrafts++;
    expect(command.opportunityId).toBe(opportunityId);
    stored.activations = [{ id: activationId, opportunity_id: opportunityId, title: command.title, description: command.description,
      proposed_brands: command.proposedBrands, intended_use: command.intendedUse, release_at: command.releaseAt, state: "draft", owner_id: actorId,
      revision: 1, review_approved_revision: null, metrics: null, updated_at: updatedAt, asset_link_ids: [], current_media_review_valid: false, publishing_allowed: false }];
  }
  if (command.action === "edit_activation") {
    const old = stored.activations[0]; expect(command.expectedRevision).toBe(old.revision);
    stored.activations = [{ ...old, title: command.title, description: command.description, proposed_brands: command.proposedBrands,
      intended_use: command.intendedUse, release_at: command.releaseAt, asset_link_ids: command.assetLinkIds,
      state: "draft", revision: old.revision + 1, review_approved_revision: null, current_media_review_valid: false }];
  }
  if (command.action === "transition_activation") {
    const old = stored.activations[0]; expect(command.expectedRevision).toBe(old.revision);
    expect(command.state).toBe("awaiting_approvals");
    expect(old.asset_link_ids).toEqual([linkId]);
    stored.activations = [{ ...old, state: "awaiting_approvals", revision: old.revision + 1, review_approved_revision: old.revision + 1, current_media_review_valid: true }];
  }
  seenBodies.set(command.commandId, String(init.body));
  if (command.action === "create_activation" && loseCreateResponse) {
    loseCreateResponse = false;
    return Promise.reject(new Error("Connection lost after save"));
  }
  return Promise.resolve(Response.json({ record: { id: command.action === "create_activation" ? activationId : opportunityId, revision: 1 }, duplicate: false }));
}
beforeEach(() => {
  stored = emptyStore(); commands = []; conflict = false; failRefresh = false; loseCreateResponse = false; createdDrafts = 0; seenBodies = new Map(); updated.mockClear();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  api = vi.fn(mockPersistence); vi.stubGlobal("fetch", api);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

describe("durable workflow review panel behavior", () => {
  it("requires a reason and explicit blocker acknowledgment, then accepts and creates a persisted proposal draft", async () => {
    await render();
    expect(button("Save for review")?.disabled).toBe(true);
    await click("Save for review"); expect(api).not.toHaveBeenCalled();
    await fill("Review reason", "Reviewed the source and unresolved permissions separately");
    await click("Save for review");
    expect(commands[0]).toMatchObject({ action: "register_opportunity", opportunityKey: candidate.key, playerId, momentId: candidate.momentId,
      signalKeys: candidate.signalKeys, evidenceIds: candidate.evidence.map(row => row.id), runId: null });
    expect(commands[0].commandId).toMatch(/^[0-9a-f-]{36}$/);
    expect(button("Save for review")).toBeNull();
    expect(button("Accept opportunity")?.disabled).toBe(true);
    await click("Review");
    expect(host.textContent).toContain("in review · revision 2");
    expect(button("Mark ready")?.disabled).toBe(true);
    const ack = control("I reviewed the readiness blockers");
    await act(async () => ack.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await click("Mark ready");
    expect(commands[2]).toMatchObject({ action: "review_opportunity", expectedRevision: 2, state: "ready", readinessBlockers: [] });
    await click("Accept opportunity");
    expect(commands[3]).toMatchObject({ action: "review_opportunity", expectedRevision: 3, state: "accepted" });
    await click("Create activation draft");
    await fill("Description", "An editorial proposal; permission and athlete review still required.");
    await fill("Proposed brand", "Example proposed brand");
    const form = host.querySelector('form[aria-label="Activation draft"]'); expect(form).toBeTruthy();
    await act(async () => form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(commands[4]).toMatchObject({ action: "create_activation", opportunityId, intendedUse: "internal_review", proposedBrands: [{ name: "Example proposed brand", status: "proposed" }] });
    expect(commands[4]).not.toHaveProperty("actorId"); expect(commands[4]).not.toHaveProperty("metrics");
    expect(host.textContent).toContain("Reach and revenue: unavailable");
    expect(host.textContent).toContain("Publication blocked");
    expect(host.textContent).toContain("Media review: Missing or stale");
    expect(stored.activations[0]).toMatchObject({ metrics: null, publishing_allowed: false });
    expect(api.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(5);
    expect(api.mock.calls.filter(([, init]) => init?.method !== "POST")).toHaveLength(5);
    expect(updated).toHaveBeenLastCalledWith(expect.objectContaining({ activations: [expect.objectContaining({ id: activationId })] }));
    await act(async () => root.unmount()); root = createRoot(host);
    await render(fixture(structuredClone(stored)));
    expect(host.textContent).toContain("draft · revision 1");
    expect(button("Save for review")).toBeNull();
    expect(button("Create activation draft")).toBeTruthy();
  });

  it.each(["disabled", "unavailable", "synthetic"] as const)("prevents writes in %s mode without implying publication or measured revenue", async (mode) => {
    stored.opportunities = [record("accepted")];
    const data = fixture(stored);
    if (mode === "synthetic") data.dataMode = "synthetic"; else data.workflowState = mode;
    await render(data);
    expect(button("Save for review")).toBeNull(); expect(button("Create activation draft")).toBeNull();
    expect(host.querySelector('textarea[aria-label="Review reason"]')).toBeNull();
    expect(api).not.toHaveBeenCalled();
    expect(host.textContent).toContain(mode === "synthetic" ? "Synthetic examples never write" : "disabled or unavailable");
  });

  it("preserves planned release and canonical asset choices while edits invalidate review and still allow requesting a new review", async () => {
    stored.opportunities = [record("accepted")];
    const planned = "2026-11-01T20:30:00.000Z";
    stored.momentAssetLinks = [{ id: linkId, environment: "development", player_id: playerId, moment_id: candidate.momentId,
      legacy_media_id: assetId, legacy_video_id: null, status: "verified", evidence_ids: candidate.evidence.map(row => row.id), review_reason: "This exact asset documents the reviewed Moment",
      reviewed_by: actorId, revision: 1, updated_at: updatedAt, current_display_eligible: true },
    { id: unrelatedMomentId, environment: "development", player_id: playerId, moment_id: unrelatedMomentId,
      legacy_media_id: unrelatedAssetId, legacy_video_id: null, status: "verified", evidence_ids: candidate.evidence.map(row => row.id), review_reason: "Different reviewed Moment",
      reviewed_by: actorId, revision: 1, updated_at: updatedAt, current_display_eligible: true }];
    stored.activations = [{ id: activationId, opportunity_id: opportunityId, title: "Reviewed draft", description: "Original proposal",
      proposed_brands: [{ name: "Proposed example brand", status: "proposed" }], intended_use: "internal_review", release_at: planned, state: "awaiting_approvals", owner_id: actorId,
      revision: 5, review_approved_revision: 5, metrics: null, updated_at: updatedAt, asset_link_ids: [linkId], current_media_review_valid: true, publishing_allowed: false }];
    await render(); await fill("Review reason", "Changed editorial plan; submit a fresh review"); await click("Edit draft and assets");
    expect(new Date(control("Planned release (local time)").value).toISOString()).toBe(planned);
    expect(control(assetId)).toHaveProperty("checked", true);
    expect([...host.querySelectorAll("label")].some(row => row.textContent === unrelatedAssetId)).toBe(false);
    await fill("Title", "Revised draft"); await fill("Intended use", "print");
    const form = host.querySelector('form[aria-label="Activation draft"]')!;
    await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(commands[0]).toMatchObject({ action: "edit_activation", id: activationId, expectedRevision: 5, releaseAt: planned, assetLinkIds: [linkId], intendedUse: "print" });
    expect(stored.activations[0]).toMatchObject({ revision: 6, review_approved_revision: null, current_media_review_valid: false, metrics: null, publishing_allowed: false });
    expect(button("Request review")?.disabled).toBe(false);
    await click("Request review");
    expect(commands[1]).toMatchObject({ action: "transition_activation", expectedRevision: 6, state: "awaiting_approvals" });
    expect(host.textContent).toContain("intended-use clearance still required");
    expect(host.textContent).toContain("Reach and revenue: unavailable");
    expect(button("Publish")).toBeNull();
  });

  it("reports optimistic conflict without applying a decision or overwriting the displayed revision", async () => {
    stored.opportunities = [record()]; conflict = true;
    await render(); await fill("Review reason", "Reviewed evidence"); await click("Dismiss");
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("This record changed. Reload before reviewing it.");
    expect(host.textContent).toContain("candidate · revision 1");
    expect(api).toHaveBeenCalledTimes(1); expect(updated).not.toHaveBeenCalled();
  });

  it("retries an ambiguous draft save with the exact same command after its current form reason is cleared", async () => {
    stored.opportunities = [record("accepted")]; loseCreateResponse = true;
    await render(); await fill("Review reason", "Original reviewed proposal reason"); await click("Create activation draft");
    await fill("Description", "Draft saved but acknowledgment is lost");
    const form = host.querySelector('form[aria-label="Activation draft"]')!;
    await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(createdDrafts).toBe(1);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Connection lost after save");
    expect(button("Retry pending save")).toBeTruthy();
    await fill("Title", "Changed form while prior result is unknown");
    await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(commands).toHaveLength(1);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("previous save has an unknown result");
    await fill("Review reason", "");
    await click("Retry pending save");
    expect(commands).toHaveLength(2);
    expect(commands[1]).toEqual(commands[0]);
    const posts = api.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(posts[1][1]?.body).toBe(posts[0][1]?.body);
    expect(createdDrafts).toBe(1); expect(stored.activations).toHaveLength(1);
    expect(button("Retry pending save")).toBeNull();
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.textContent).toContain("Draft saved but acknowledgment is lost");
  });

  it("keeps saved-but-unreloaded state explicit and preserves dismissed decisions across mounting", async () => {
    stored.opportunities = [record()]; failRefresh = true;
    await render(); await fill("Review reason", "No qualifying action"); await click("Dismiss");
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Saved, but current review state could not be reloaded");
    expect(host.textContent).toContain("candidate · revision 1");
    expect(updated).not.toHaveBeenCalled();
    await act(async () => root.unmount()); root = createRoot(host); failRefresh = false;
    await render(fixture(structuredClone(stored)));
    expect(host.textContent).toContain("dismissed · revision 2");
    expect(button("Review")).toBeNull(); expect(button("Accept opportunity")).toBeNull(); expect(button("Save for review")).toBeNull();
  });
});
