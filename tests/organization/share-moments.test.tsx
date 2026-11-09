import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { sitePost, staffMessage } from "@/components/organization/pilot/ShareActivation";
import { MomentTimeline } from "@/components/organization/pilot/MomentTimeline";
import { previewActivations, previewAthleteFile } from "@/components/organization/pilot/preview-data";
import type { PilotActivation } from "@/lib/enterprise-crm/pilot/types";

const row: PilotActivation = {
  ...previewActivations[0], kind: "article", title: "Dante <looks> back", brief: "Interview Dante.\nPublish with the Locker link.", dueOn: "2026-11-28",
  athletes: [{ id: "p5", name: "Dante Hughes", portraitUrl: null }], playerName: "Dante Hughes",
};

describe("sharing an activation", () => {
  it("writes one note for staff with the brief and both links", () => {
    expect(staffMessage(row, "https://bltz.me/api/go/a1", "https://bltz.me/organization/x/intelligence/p5")).toBe([
      "Article: Dante <looks> back",
      "Featuring Dante Hughes, due November 28, 2026",
      "Brief: Interview Dante.\nPublish with the Locker link.",
      "Fan Locker link (tracked): https://bltz.me/api/go/a1",
      "Open in BLTZ: https://bltz.me/organization/x/intelligence/p5",
    ].join("\n"));
  });

  it("builds a website post with escaped HTML and the tracked Locker link", () => {
    const post = sitePost(row, "https://bltz.me/api/go/a1?x=1&y=2", "Cal Athletics");
    expect(post.html).toBe([
      "<h2>Dante &lt;looks&gt; back</h2>",
      "<p>Interview Dante.</p>",
      "<p>Publish with the Locker link.</p>",
      '<p><a href="https://bltz.me/api/go/a1?x=1&amp;y=2">Visit Dante Hughes&#39;s fan Locker</a></p>',
    ].join("\n").replace("&#39;", "'"));
    expect(sitePost({ ...row, brief: null }, "https://x", "Cal Athletics").paragraphs[0]).toBe("Cal Athletics celebrates Dante Hughes.");
  });
});

describe("Moment timeline", () => {
  it("expands a Moment to its stats, sources, same-day coverage and what was planned from it", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement("div");
    document.body.replaceChildren(container);
    const onPlan = vi.fn();
    const file = previewAthleteFile("p1")!;
    act(() => createRoot(container).render(<MomentTimeline file={file} activations={previewActivations} canManage onPlan={onPlan} onShowActivation={vi.fn()} />));

    const first = container.querySelector<HTMLButtonElement>(".pilot-moment__head")!;
    expect(first.getAttribute("aria-expanded")).toBe("false");
    act(() => first.click());
    const open = container.querySelector(".pilot-moment--open")!;
    expect([...open.querySelectorAll(".pilot-moment__stats div")].map((stat) => stat.textContent)).toEqual(["112rec yds", "7rec", "1rec TD"]);
    expect(open.textContent).toContain("Sample: school game notes");
    expect(open.textContent).toContain("Sample: Game recap, Marcus Hale scores first touchdown");
    expect(open.querySelector(".pilot-moment__runs")?.textContent).toBe("10 years since his first career touchdown");

    act(() => [...open.querySelectorAll("button")].find((button) => button.textContent?.includes("Plan from this Moment"))!.click());
    expect(onPlan).toHaveBeenCalledWith(file.moments[0]);
  });
});
