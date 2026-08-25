import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssignmentDrawer, type AssignmentDrawerState } from "@/components/enterprise-crm/workflow";

let container: HTMLDivElement;
let root: Root;
const members = [{ id: "member-1", label: "Morgan Lee", context: "Eligible member" }];
const priorities = [{ value: "caller-priority", label: "Caller priority" }];
function click(element: Element) { act(() => element.dispatchEvent(new MouseEvent("click", { bubbles: true }))); }

function Harness({ onSubmit = () => undefined, state = "default" as AssignmentDrawerState }: { onSubmit?: (value: unknown) => void; state?: AssignmentDrawerState }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)}>Open assignment</button><AssignmentDrawer open={open} onOpenChange={setOpen} sourceTitle="Fictional source" members={members} priorities={priorities} state={state} onSubmit={onSubmit} /></>;
}

describe("AssignmentDrawer interaction contract", () => {
  beforeEach(() => { container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
  afterEach(() => { act(() => root.unmount()); document.querySelectorAll('[data-slot="sheet-overlay"], [data-slot="sheet-content"]').forEach((node) => node.remove()); container.remove(); });

  it("moves focus inside, traps modal semantics, protects unsaved changes, and returns focus", async () => {
    render(<Harness />);
    const trigger = container.querySelector("button")!; trigger.focus(); click(trigger);
    await act(async () => undefined);
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog).not.toBeNull(); expect(dialog.getAttribute("data-state")).toBe("open");
    const owner = dialog.querySelector("select") as HTMLSelectElement; expect(document.activeElement).toBe(owner);
    owner.value = "member-1"; act(() => owner.dispatchEvent(new Event("change", { bubbles: true })));
    const close = [...dialog.querySelectorAll("button")].find((button) => button.textContent === "Close")!; click(close);
    const confirmation = document.querySelector<HTMLElement>('[role="alertdialog"]')!;
    expect(confirmation.textContent).toContain("Discard unsaved changes");
    expect(confirmation.getAttribute("aria-modal")).toBe("true");
    expect(confirmation.getAttribute("aria-labelledby")).toBeTruthy();
    expect(confirmation.getAttribute("aria-describedby")).toBeTruthy();
    expect(confirmation.contains(document.activeElement)).toBe(true);
    expect(document.activeElement?.textContent).toBe("Keep editing");
    click([...confirmation.querySelectorAll("button")].find((button) => button.textContent === "Keep editing")!); await act(async () => undefined); expect(document.querySelector('[role="dialog"]')).not.toBeNull(); expect(document.activeElement).toBe(owner);
    click(close); click([...dialog.querySelectorAll("button")].find((button) => button.textContent === "Discard changes")!);
    await act(async () => undefined);
    expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(document.activeElement).toBe(trigger);
  });

  it("closes dirty confirmation with Escape, preserves the draft, and restores owner focus", async () => {
    render(<Harness />);
    const trigger = container.querySelector("button")!; trigger.focus(); click(trigger); await act(async () => undefined);
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    const owner = dialog.querySelector("select") as HTMLSelectElement;
    owner.value = "member-1"; act(() => owner.dispatchEvent(new Event("change", { bubbles: true })));
    click([...dialog.querySelectorAll("button")].find((button) => button.textContent === "Close")!);
    const confirmation = document.querySelector<HTMLElement>('[role="alertdialog"]')!;
    act(() => confirmation.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    await act(async () => undefined);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(owner.value).toBe("member-1");
    expect(document.activeElement).toBe(owner);
  });

  it("validates caller-required selections and emits only the typed callback draft", async () => {
    const submit = vi.fn(); render(<Harness onSubmit={submit} />); click(container.querySelector("button")!); await act(async () => undefined);
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    click([...dialog.querySelectorAll("button")].find((button) => button.textContent === "Assign")!); expect(dialog.textContent).toContain("Choose an eligible member and priority"); expect(submit).not.toHaveBeenCalled();
    const selects = dialog.querySelectorAll("select"); (selects[0] as HTMLSelectElement).value = "member-1"; act(() => selects[0].dispatchEvent(new Event("change", { bubbles: true }))); (selects[1] as HTMLSelectElement).value = "caller-priority"; act(() => selects[1].dispatchEvent(new Event("change", { bubbles: true })));
    click([...dialog.querySelectorAll("button")].find((button) => button.textContent === "Assign")!); expect(submit).toHaveBeenCalledWith({ memberId: "member-1", priority: "caller-priority", dueDate: "", comment: "" });
  });

  it("renders error, success, processing, and restricted outcomes without authorizing", async () => {
    render(<AssignmentDrawer open onOpenChange={() => undefined} sourceTitle="Source" members={members} priorities={priorities} state="error" errorMessage="Recoverable conflict" onSubmit={() => undefined} />); await act(async () => undefined); expect(document.body.textContent).toContain("Recoverable conflict");
    render(<AssignmentDrawer open onOpenChange={() => undefined} sourceTitle="Source" members={members} priorities={priorities} state="success" onSubmit={() => undefined} />); await act(async () => undefined); expect(document.body.textContent).toContain("Owner assigned");
    render(<AssignmentDrawer open onOpenChange={() => undefined} sourceTitle="Source" members={members} priorities={priorities} state="submitting" onSubmit={() => undefined} />); await act(async () => undefined); expect(document.body.textContent).toContain("Assigning…");
    render(<AssignmentDrawer open onOpenChange={() => undefined} sourceTitle="Source" members={members} priorities={priorities} state="restricted" onSubmit={() => undefined} />); await act(async () => undefined); expect(document.body.textContent).toContain("Assignment is not available"); expect([...document.querySelectorAll("button")].some((button) => button.textContent === "Assign")).toBe(false);
  });

  it("shows source context and optional caller fields while keeping an error retry-ready", async () => {
    render(<AssignmentDrawer open onOpenChange={() => undefined} sourceTitle="Fictional source" sourceContext={<span>Caller context</span>} members={members} priorities={priorities} initialValue={{ memberId: "member-1", priority: "caller-priority", dueDate: "2026-08-29", comment: "Caller comment" }} state="error" errorMessage="Recoverable caller conflict" onSubmit={() => undefined} />);
    await act(async () => undefined);
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(dialog.textContent).toContain("Fictional source");
    expect(dialog.textContent).toContain("Caller context");
    expect((dialog.querySelector('input[type="date"]') as HTMLInputElement).value).toBe("2026-08-29");
    expect((dialog.querySelector("textarea") as HTMLTextAreaElement).value).toBe("Caller comment");
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain("Recoverable caller conflict");
    expect([...dialog.querySelectorAll("select, input, textarea, button")].filter((control) => !(control as HTMLButtonElement).disabled).length).toBeGreaterThan(4);
    expect(dialog.textContent).not.toContain("authorized");
  });

  it("disables mutation fields while submitting and retains a deterministic enabled close path", async () => {
    render(<Harness state="submitting" />); const trigger = container.querySelector("button")!; trigger.focus(); click(trigger); await act(async () => undefined);
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect([...dialog.querySelectorAll("select, input, textarea")].every((control) => (control as HTMLInputElement).disabled)).toBe(true);
    expect([...dialog.querySelectorAll("button")].find((button) => button.textContent === "Cancel")?.disabled).toBe(true);
    expect([...dialog.querySelectorAll("button")].find((button) => button.textContent === "Assigning…")?.disabled).toBe(true);
    const close = [...dialog.querySelectorAll("button")].find((button) => button.textContent === "Close")!;
    expect(close.disabled).toBe(false);
    click(close); await act(async () => undefined);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it.each(["success", "restricted"] as const)("keeps a deterministic close path for %s", async (state) => {
    render(<Harness state={state} />); const trigger = container.querySelector("button")!; trigger.focus(); click(trigger); await act(async () => undefined);
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.contains(document.activeElement)).toBe(true);
    const close = [...dialog.querySelectorAll("button")].find((button) => button.textContent === "Close")!;
    expect(close).toBeTruthy(); click(close); await act(async () => undefined);
    expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(trigger.isConnected).toBe(true);
  });
});

function render(node: React.ReactNode) { act(() => root.render(<div data-product="enterprise-crm">{node}</div>)); }
