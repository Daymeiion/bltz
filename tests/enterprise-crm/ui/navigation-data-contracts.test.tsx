import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Breadcrumb, FilterBar, SearchInput } from "@/components/enterprise-crm/navigation";
import { AvatarGroup, DataTable, MetricDelta, Pagination, Sparkline, type DataTableSort } from "@/components/enterprise-crm/data";

let container: HTMLDivElement;
let root: Root;

function render(node: React.ReactNode) {
  act(() => root.render(<div data-product="enterprise-crm">{node}</div>));
}

function click(element: Element) {
  act(() => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

function activate(element: HTMLElement, key: "Enter" | " ") {
  act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    element.click();
  });
}

describe("Gate 3C navigation and data contracts", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders ordered breadcrumb hierarchy with linked ancestors, a current page, and an intact long label", () => {
    const longLabel = "A deliberately long caller-supplied rights and provenance review label";
    render(<Breadcrumb label="Executive hierarchy" items={[{ label: "Home", href: "/home" }, { label: "Media", href: "/media" }, { label: longLabel }]} />);

    const nav = container.querySelector('nav[aria-label="Executive hierarchy"]')!;
    expect([...nav.querySelectorAll("li:not([aria-hidden])")].map((node) => node.textContent)).toEqual(["Home", "Media", longLabel]);
    expect([...nav.querySelectorAll("a")].map((link) => link.getAttribute("href"))).toEqual(["/home", "/media"]);
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe(longLabel);
  });

  it("labels filters, announces results, resets only when active, and omits reset at zero", () => {
    const reset = vi.fn();
    render(<FilterBar label="Member filters" activeCount={2} resultSummary="7 fictional results" onReset={reset}><span>Caller control</span></FilterBar>);
    const region = container.querySelector('section[aria-label="Member filters"]')!;
    expect(region.textContent).toContain("2 active");
    expect(region.querySelector('[aria-live="polite"]')?.textContent).toBe("7 fictional results");
    activate([...region.querySelectorAll("button")][0] as HTMLButtonElement, "Enter");
    expect(reset).toHaveBeenCalledOnce();

    render(<FilterBar activeCount={0} onReset={reset}><span>Caller control</span></FilterBar>);
    expect(container.textContent).not.toContain("active");
    expect(container.textContent).not.toContain("Reset filters");
  });

  it("supports a controlled labelled search, count announcement, clear activation, and disabled behavior", () => {
    const change = vi.fn();
    render(<SearchInput value="rights" onChange={change} label="Search fictional rights" resultCount={1} />);
    const input = container.querySelector('input[type="search"]') as HTMLInputElement;
    expect(input.getAttribute("aria-label")).toBe("Search fictional rights");
    expect(input.value).toBe("rights");
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "archive");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(change).toHaveBeenCalledWith("archive");
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe("1 result");
    activate(container.querySelector('[aria-label="Clear Search fictional rights"]') as HTMLButtonElement, " ");
    expect(change).toHaveBeenCalledWith("");

    render(<SearchInput value="rights" onChange={change} label="Search disabled" resultCount={0} disabled />);
    expect((container.querySelector("input") as HTMLInputElement).disabled).toBe(true);
    expect(container.querySelector('[aria-label="Clear Search disabled"]')).toBeNull();
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe("0 results");
  });

  it("renders finite, filtered, empty, single, and multiple-point sparklines without fabricated values", () => {
    render(<><Sparkline values={[]} label="Empty trend" summary="No samples available." /><Sparkline values={[Number.NaN, 4]} label="Single finite trend" summary="One finite sample." /><Sparkline values={[1, 3, 2]} label="Multiple trend" summary="Three finite samples." /></>);
    const graphics = [...container.querySelectorAll('svg[role="img"]')];
    expect(graphics).toHaveLength(3);
    expect(graphics[0].querySelector("polyline")).toBeNull();
    expect(graphics[1].querySelector("polyline")?.getAttribute("points")).toBe("64,40");
    expect(graphics[2].querySelector("polyline")?.getAttribute("points")?.split(" ")).toHaveLength(3);
    expect(graphics[0].querySelector("title")?.textContent).toBe("Empty trend");
    expect(graphics[0].querySelector("desc")?.textContent).toBe("No samples available.");
    expect(container.textContent).not.toContain("0");
  });

  it("exposes up/down/flat and positive/negative/neutral delta meaning without relying on color", () => {
    render(<><MetricDelta value="3" direction="up" sentiment="positive" context="since last period" /><MetricDelta value="2" direction="down" sentiment="negative" context="since last period" /><MetricDelta value="0" direction="flat" sentiment="neutral" context="since last period" /></>);
    const deltas = [...container.querySelectorAll(".crm-metric-delta")];
    expect(deltas.map((node) => node.textContent)).toEqual([
      "Up, positive3since last period",
      "Down, negative2since last period",
      "Flat, neutral0since last period",
    ]);
    expect(deltas.every((node) => node.querySelector("svg"))).toBe(true);
  });

  it("labels complete avatar membership while handling visible, remainder, empty, and max-zero cases", () => {
    const items = [{ id: "1", label: "Morgan Lee" }, { id: "2", label: "Liam Patel" }, { id: "3", label: "Ari Thomas" }];
    render(<><AvatarGroup items={items} max={2} label="Reviewers" /><AvatarGroup items={[]} label="Empty reviewers" /><AvatarGroup items={items} max={0} label="Hidden visuals" /></>);
    const groups = [...container.querySelectorAll(".crm-avatar-group")];
    expect(groups[0].getAttribute("aria-label")).toBe("Reviewers: Morgan Lee, Liam Patel, Ari Thomas");
    expect(groups[0].querySelectorAll(".crm-avatar-group__avatar")).toHaveLength(2);
    expect(groups[0].querySelector(".crm-avatar-group__remainder")?.textContent).toBe("+1");
    expect(groups[1].getAttribute("aria-label")).toBe("Empty reviewers: none");
    expect(groups[2].querySelectorAll(".crm-avatar-group__avatar")).toHaveLength(0);
    expect(groups[2].querySelector(".crm-avatar-group__remainder")?.textContent).toBe("+3");
  });

  it("supports table semantics, alignment, sort direction toggling, row actions, and zero-row structure", () => {
    const onSort = vi.fn(); const onRowAction = vi.fn();
    const rows = [{ id: "one", name: "Morgan", count: 4 }];
    const columns = [{ id: "name", header: "Name", sortable: true, cell: (row: typeof rows[number]) => row.name }, { id: "count", header: "Count", align: "end" as const, cell: (row: typeof rows[number]) => row.count }];
    function Harness() {
      const [sort, setSort] = useState<DataTableSort>({ columnId: "name", direction: "ascending" });
      return <DataTable caption="Fictional members" rows={rows} rowKey={(row) => row.id} columns={columns} sort={sort} onSort={(next) => { setSort(next); onSort(next); }} rowActionLabel={(row) => `Open ${row.name}`} onRowAction={onRowAction} />;
    }
    render(<Harness />);
    const table = container.querySelector("table")!;
    expect(table.querySelector("caption")?.textContent).toBe("Fictional members");
    expect(table.querySelector('th[data-align="end"]')?.textContent).toBe("Count");
    expect(table.querySelector('td[data-label="Count"]')?.getAttribute("data-align")).toBe("end");
    const sortButton = table.querySelector("th button") as HTMLButtonElement;
    expect(sortButton.getAttribute("aria-label")).toContain("currently ascending");
    activate(sortButton, "Enter");
    expect(onSort).toHaveBeenCalledWith({ columnId: "name", direction: "descending" });
    activate([...table.querySelectorAll("button")].find((button) => button.textContent === "Open Morgan")!, " ");
    expect(onRowAction).toHaveBeenCalledWith(rows[0]);
    render(<DataTable caption="Zero fictional rows" rows={[]} rowKey={() => "none"} columns={columns} />);
    expect(container.querySelector("table tbody")?.children).toHaveLength(0);
  });

  it("distinguishes every table state and wires reset/retry without restricted inference", () => {
    const reset = vi.fn(); const retry = vi.fn();
    const common = { columns: [], rows: [], rowKey: () => "none" };
    render(<><DataTable {...common} caption="Loading records" state="loading" /><DataTable {...common} caption="Empty records" state="empty" /><DataTable {...common} caption="Filtered records" state="filtered-empty" onResetFilters={reset} /><DataTable {...common} caption="Failed records" state="error" onRetry={retry} /><DataTable {...common} caption="Restricted secret records" state="restricted" /></>);
    expect(container.textContent).toContain("Loading Loading records");
    expect(container.textContent).toContain("No records yet");
    expect(container.textContent).toContain("No matching results");
    expect(container.textContent).toContain("This section could not load");
    expect(container.textContent).toContain("Access restricted");
    expect(container.textContent).not.toContain("Restricted secret records");
    activate([...container.querySelectorAll("button")].find((button) => button.textContent === "Reset filters")!, "Enter");
    activate([...container.querySelectorAll("button")].find((button) => button.textContent === "Retry")!, " ");
    expect(reset).toHaveBeenCalledOnce(); expect(retry).toHaveBeenCalledOnce();
  });

  it("normalizes first/middle/last and invalid pagination while preserving disabled callbacks", () => {
    const change = vi.fn();
    render(<Pagination page={2} pageCount={3} onPageChange={change} label="Member pages" />);
    const nav = container.querySelector('nav[aria-label="Member pages"]')!;
    activate([...nav.querySelectorAll("button")][0], "Enter");
    activate([...nav.querySelectorAll("button")][1], " ");
    expect(change.mock.calls).toEqual([[1], [3]]);

    render(<><Pagination page={-4} pageCount={0} onPageChange={change} /><Pagination page={99} pageCount={3} onPageChange={change} disabled /></>);
    const navs = [...container.querySelectorAll(".crm-pagination")];
    expect(navs[0].textContent).toContain("Page 1 of 1");
    expect([...navs[0].querySelectorAll("button")].every((button) => button.disabled)).toBe(true);
    expect(navs[1].textContent).toContain("Page 3 of 3");
    expect([...navs[1].querySelectorAll("button")].every((button) => button.disabled)).toBe(true);
    click(navs[1].querySelector("button")!);
    expect(change).toHaveBeenCalledTimes(2);
  });
});
