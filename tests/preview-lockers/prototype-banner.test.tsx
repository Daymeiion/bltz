import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PrototypeBanner from "@/components/preview-lockers/PrototypeBanner";

describe("PrototypeBanner", () => {
  it("labels previews as private demos and disclaims media rights", () => {
    const html = renderToStaticMarkup(<PrototypeBanner />);
    expect(html).toContain('role="note"');
    expect(html).toContain("Prototype / Demo — Private preview");
    expect(html).toContain("Not available for public view");
    expect(html).toContain("does not claim or guarantee any rights");
  });
});
