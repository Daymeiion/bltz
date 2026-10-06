import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHtml, stripHtml, pickFirst } from "@/lib/pipeline/fetch";

afterEach(() => vi.unstubAllGlobals());

it("refuses restricted and metadata-only raw extraction before a request", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  expect(await fetchHtml("https://www.pro-football-reference.com/players/F/Fixture00.htm")).toEqual({ ok: false, reason: "blocked" });
  expect(await fetchHtml("https://example.com/story")).toEqual({ ok: false, reason: "blocked" });
  expect(fetcher).not.toHaveBeenCalled();
});

it("bounds registered HTML and never follows a redirect to another source", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("<p>Biography</p>")); vi.stubGlobal("fetch", fetcher);
  expect(await fetchHtml("https://en.wikipedia.org/wiki/Fixture_Athlete")).toMatchObject({ ok: true, html: "<p>Biography</p>" });
  expect(fetcher.mock.calls[0][1]).toMatchObject({ cache: "no-store", redirect: "error" });
  fetcher.mockResolvedValue(new Response("x".repeat(1024 * 1024 + 1)));
  expect(await fetchHtml("https://en.wikipedia.org/wiki/Fixture_Athlete")).toEqual({ ok: false, reason: "blocked" });
});

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
