// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PreviewVideoSource } from "@/app/preview-lockers/[slug]/videos/page";

it("renders only hardened YouTube privacy embeds", () => {
  const html = renderToStaticMarkup(<PreviewVideoSource video={{ id: "youtube", title: "YouTube source", url: "https://www.youtube.com/watch?v=abcdefghijk" }} />);
  expect(html).toContain("https://www.youtube-nocookie.com/embed/abcdefghijk");
  expect(html).toContain('sandbox="allow-scripts allow-same-origin allow-presentation"');
  expect(html).not.toContain("<video");
});

it("keeps direct and unsupported video URLs as source links without loading them", () => {
  const url = "https://media.example.com/private-demo.mp4";
  const html = renderToStaticMarkup(<PreviewVideoSource video={{ id: "direct", title: "Direct source", url }} />);
  expect(html).toContain(`href="${url}"`);
  expect(html).toContain("not loaded inside BLTZ");
  expect(html).not.toContain(`<video`);
  expect(html).not.toContain(`src="${url}"`);
});
