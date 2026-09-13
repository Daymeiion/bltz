import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FolderTabs } from "@/components/organization/preview/PreviewPrimitives";

const tabs = ["Profile", "Social", "Digital presence", "Recommendations"] as const;

function TabsHarness() {
  const [active, setActive] = useState<string>(tabs[0]);
  return <FolderTabs tabs={tabs} active={active} onChange={setActive} label="Player views" />;
}

let container: HTMLDivElement;
let root: Root;

describe("preview workspace primitives", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<TabsHarness />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("supports roving focus and arrow-key tab selection", () => {
    const renderedTabs = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    renderedTabs[0].focus();

    act(() => {
      renderedTabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });

    expect(renderedTabs[1].getAttribute("aria-selected")).toBe("true");
    expect(renderedTabs[1].tabIndex).toBe(0);
    expect(document.activeElement).toBe(renderedTabs[1]);
  });

  it("supports Home and End navigation", () => {
    const renderedTabs = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    renderedTabs[0].focus();

    act(() => {
      renderedTabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    });
    expect(renderedTabs.at(-1)?.getAttribute("aria-selected")).toBe("true");

    act(() => {
      renderedTabs.at(-1)?.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    });
    expect(renderedTabs[0].getAttribute("aria-selected")).toBe("true");
  });
});
