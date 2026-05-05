import { describe, expect, it } from "vitest";
import { stripHtml, pickFirst } from "@/lib/pipeline/fetch";

describe("stripHtml", () => {
  it("strips tags and condenses whitespace", () => {
    const html =
      "<p>Hello <strong>world</strong></p>   \n  <em>BLTZ</em>";
    expect(stripHtml(html)).toBe("Hello world BLTZ");
  });

  it("removes script and style content entirely", () => {
    const html =
      "<p>Keep me</p><script>console.log('drop')</script><style>.x{}</style>";
    expect(stripHtml(html)).toBe("Keep me");
  });

  it("decodes a few common entities", () => {
    expect(stripHtml("a&nbsp;b&amp;c&quot;d&#39;e")).toBe(`a b&c"d'e`);
  });
});

describe("pickFirst", () => {
  it("returns the first defined non-null value", () => {
    expect(pickFirst<string>(undefined, null, "ok", "ignored")).toBe("ok");
  });

  it("returns undefined when nothing is set", () => {
    expect(pickFirst<number>(undefined, null)).toBeUndefined();
  });

  it("treats 0 and empty string as defined", () => {
    expect(pickFirst<number>(undefined, 0, 5)).toBe(0);
    expect(pickFirst<string>(undefined, "", "fallback")).toBe("");
  });
});
