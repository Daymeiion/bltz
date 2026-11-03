import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OrganizationThemeProvider, useOrganizationTheme } from "@/components/organization/OrganizationTheme";

function ThemeHarness() {
  const { mode, accent, setMode } = useOrganizationTheme();
  return <button type="button" data-mode={mode} data-accent={accent} onClick={() => setMode("school")}>Use school theme</button>;
}

let container: HTMLDivElement;
let root: Root;

describe("Enterprise CRM theme overlay", () => {
  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("uses BLTZ action blue by default and a validated presentation-only school accent", () => {
    act(() => root.render(<OrganizationThemeProvider schoolAccent="#8b1e3f"><ThemeHarness /></OrganizationThemeProvider>));
    const button = container.querySelector("button")!;
    expect(button.dataset.mode).toBe("bltz");
    expect(button.dataset.accent).toBe("#2952ff");
    act(() => button.click());
    expect(button.dataset.mode).toBe("school");
    expect(button.dataset.accent).toBe("#8b1e3f");
    expect(window.localStorage.getItem("bltz-enterprise-theme")).toBe("school");
  });

  it("falls back safely when a supplied school color is invalid", () => {
    act(() => root.render(<OrganizationThemeProvider schoolAccent="not-a-color"><ThemeHarness /></OrganizationThemeProvider>));
    const button = container.querySelector("button")!;
    act(() => button.click());
    expect(button.dataset.accent).toBe("#d6a500");
  });
});
