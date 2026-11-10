import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PartnershipsPage from "@/app/admin/partnerships/page";
import VeritonePilotPage from "@/app/admin/partnerships/veritone/page";
import VeritoneWorkflowPage from "@/app/admin/partnerships/veritone/workflow/page";

describe("Partnership meeting navigation", () => {
  it("links each partner card to its own meeting materials", () => {
    document.body.innerHTML = renderToStaticMarkup(<PartnershipsPage />);
    expect(document.querySelector('a[href="/admin/partnerships/getty"] h2')?.textContent).toBe("Getty Images");
    expect(document.querySelector('a[href="/admin/partnerships/veritone"] h2')?.textContent).toBe("Veritone");
  });

  it("links the Veritone one-sheet and workflow in both directions", () => {
    document.body.innerHTML = renderToStaticMarkup(<VeritonePilotPage />);
    expect(document.querySelector('a[aria-current="page"]')?.getAttribute("href")).toBe("/admin/partnerships/veritone");
    expect(document.querySelector('a[href="/admin/partnerships/veritone/workflow"]')).not.toBeNull();

    document.body.innerHTML = renderToStaticMarkup(<VeritoneWorkflowPage />);
    expect(document.querySelector('a[aria-current="page"]')?.getAttribute("href")).toBe("/admin/partnerships/veritone/workflow");
    expect(document.querySelector('a[href="/admin/partnerships/veritone"]')).not.toBeNull();
    expect(document.querySelector('a[href="/admin/partnerships"]')).not.toBeNull();
    expect([...document.querySelectorAll("ol li > div:first-child > p:first-child")].map((element) => element.textContent)).toEqual([
      "Week 1", "Week 2", "Weeks 3–4", "Week 5", "Week 6",
    ]);
  });
});
