// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PreviewVideoSource } from "@/app/preview-lockers/[slug]/videos/page";

it("preserves the original YouTube URL as a safe external source link with explicit unverified rights", () => {
  const url = "https://www.youtube.com/watch?v=abcdefghijk";
  const html = renderToStaticMarkup(<PreviewVideoSource video={{ id: "youtube", title: "YouTube source", url }} />);
  expect(html).toContain('<h2>YouTube source</h2>');
  expect(html).toContain(`href="${url}"`);
  expect(html).toContain('target="_blank" rel="noopener noreferrer"');
  expect(html).toContain("Open source · rights unverified");
  expect(html).not.toContain("<video");
});

it("keeps direct and unsupported video URLs as source links without loading them", () => {
  const url = "https://media.example.com/private-demo.mp4";
  const html = renderToStaticMarkup(<PreviewVideoSource video={{ id: "direct", title: "Direct source", url }} />);
  expect(html).toContain(`href="${url}"`);
  expect(html).toContain('target="_blank" rel="noopener noreferrer"');
  expect(html).toContain("Open source · rights unverified");
  expect(html).toContain("not loaded inside BLTZ");
  expect(html).not.toContain("<video");
  expect(html).not.toContain(`src="${url}"`);
});
