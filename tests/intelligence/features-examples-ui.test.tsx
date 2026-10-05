import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSyntheticWorkflowExamples } from "@/lib/intelligence/features/examples";
import { SyntheticExamples } from "@/app/admin/intelligence/examples/SyntheticExamples";

let host: HTMLDivElement;
let root: Root;
let localWrite: ReturnType<typeof vi.spyOn>;
let sessionWrite: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal("fetch", vi.fn());
  localWrite = vi.spyOn(localStorage, "setItem");
  sessionWrite = vi.spyOn(sessionStorage, "setItem");
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
async function render() { await act(async () => root.render(<SyntheticExamples examples={buildSyntheticWorkflowExamples()} />)); }
async function choose(id: string) {
  const select = host.querySelector<HTMLSelectElement>("#synthetic-scenario")!;
  await act(async () => { select.value = id; select.dispatchEvent(new Event("change", { bubbles: true })); });
}

describe("Read-only synthetic workflow examples", () => {
  it("starts with six selectable cases and a persistent isolation notice", () => {
    const html = renderToStaticMarkup(<SyntheticExamples examples={buildSyntheticWorkflowExamples()} />);
    expect(html.match(/<option /g)).toHaveLength(6);
    expect(html).toContain("Synthetic example · development only");
    expect(html).toContain("No live counts, partner reports, rankings, events, financial allocations or payouts are changed");
    expect(html).toContain("Synthetic Athlete A");
    expect(html).not.toContain("Development measurements");
    expect(html).not.toMatch(/<button|<form|<input/);
  });
  it("renders actual measured results and shared signal card without publishing or storing selection", async () => {
    await render(); await choose("measured_discovery_to_activation_draft");
    expect(host.querySelector('section[aria-label="Discovery and engagement"]')?.textContent).toContain("Synthetic measurements");
    expect(host.querySelector('section[aria-label="Discovery and engagement"]')?.textContent).toContain("120");
    expect(host.querySelector('section[aria-label="Discovery and engagement"]')?.textContent).toContain("200%");
    expect(host.querySelector('section[aria-label="Synthetic signals"] details')?.textContent).toContain("locker discovery spike");
    expect(host.textContent).toContain("Synthetic Brand A · proposed");
    expect(host.textContent).toContain("Local draft");
    expect(host.textContent).not.toContain("approved partnership");
    expect(fetch).not.toHaveBeenCalled(); expect(localWrite).not.toHaveBeenCalled(); expect(sessionWrite).not.toHaveBeenCalled();
  });
  it("keeps coverage suppression and zero-baseline results visible after changing scenarios", async () => {
    await render(); await choose("zero_baseline_and_partial_coverage");
    expect(host.textContent).toContain("partial");
    expect(host.textContent).toContain("new activity");
    expect(host.textContent).not.toContain("Infinity");
    expect(host.querySelector('section[aria-label="Synthetic signals"]')?.textContent).not.toContain("locker discovery spike");
    expect(host.querySelector('[aria-label="Synthetic isolation notice"]')).not.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("labels financial arithmetic and unexecuted workflow contracts honestly", async () => {
    await render(); await choose("license_distribution_conversion_and_refund");
    expect(host.textContent).toContain("arithmetic simulation");
    expect(host.textContent).toContain("1,500"); expect(host.textContent).toContain("600");
    expect(host.textContent).toContain("No transaction or allocation engine is invoked");
    expect(host.querySelector('section[aria-label="Discovery and engagement"]')).toBeNull();
    await choose("rights_revocation_after_approval");
    expect(host.textContent).toContain("Contract expectation");
    expect(host.textContent).toContain("Not executed");
    expect(host.textContent).toContain("Pause expected; not executed");
    expect(host.textContent).toContain("are not executed here");
    expect(fetch).not.toHaveBeenCalled(); expect(localWrite).not.toHaveBeenCalled(); expect(sessionWrite).not.toHaveBeenCalled();
  });
  it("shows repeated delivery deduplication and preserves the pending reconciliation distinction", async () => {
    await render(); await choose("duplicate_delivery_and_stale_feature_job");
    expect(host.textContent).toContain("logical event count");
    expect(host.textContent).toContain("2026-10-04T19:00:00Z");
    expect(host.textContent).toContain("Contract expectation");
    expect(host.textContent).not.toContain("Synthetic Brand A");
    expect(host.querySelector('section[aria-label="Synthetic activation"]')).toBeNull();
    expect(host.querySelectorAll("button")).toHaveLength(0);
  });
});
