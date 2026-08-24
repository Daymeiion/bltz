import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OrganizationDashboardOverview } from "@/components/organization/OrganizationDashboardOverview";

let container: HTMLDivElement;
let root: Root;

describe("organization overview", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("links preview actions to focused workspaces and labels fixtures", () => {
    act(() => {
      root.render(
        <OrganizationDashboardOverview
          organizationName="Westlake University Athletics"
          organizationId="preview-org"
          teamCount={3}
          seasonCount={2}
          preview
        />,
      );
    });

    expect(container.textContent).toContain("Preview data");
    expect(container.querySelector('a[href="/organization/preview/media"]')).not.toBeNull();
    expect(container.querySelector('a[href="/organization/preview/players"]')).not.toBeNull();
    expect(container.querySelector('a[href="/organization/preview/reports"]')).not.toBeNull();
    expect(container.textContent).toContain("32 of 50 reviewed assets");
    expect(container.textContent).toContain("18 of 25 assigned actions");
  });

  it("does not present fixture percentages in the authenticated workspace", () => {
    act(() => {
      root.render(
        <OrganizationDashboardOverview
          organizationName="BLTZ Test Organization"
          organizationId="11111111-1111-4111-8111-111111111111"
          teamCount={0}
          seasonCount={0}
        />,
      );
    });

    expect(container.textContent).not.toContain("Preview data");
    expect(container.textContent).not.toContain("64%");
    expect(container.textContent).toContain("Available after Media Graph");
    expect(container.querySelector('a[href="/organization/preview/media"]')).toBeNull();
  });
});
