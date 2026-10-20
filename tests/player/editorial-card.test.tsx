import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { EditorialCard } from "@/components/player/EditorialCard";
import { SUPER_BOWL_REFERENCE } from "@/lib/enrichment/award-reference-images";

it.each([
  "BLTZ-provided reference artwork",
  "BLTZ-provided reference artwork; original creator not recorded.",
])("omits the generic award image caption: %s", attribution => {
  const html = renderToStaticMarkup(<EditorialCard award title="Example honor" image="https://example.com/trophy.png" description="Award description" meta="2007" href="https://example.com/award" attribution={attribution} />);
  expect(html).not.toContain(attribution);
  expect(html).toContain("Example honor");
  expect(html).toContain("Award description");
  expect(html).toContain("2007");
  expect(html).toContain('href="https://example.com/award"');
});

it("retains an actual creator credit on an award image", () => {
  const html = renderToStaticMarkup(<EditorialCard award title="Example honor" image="https://example.com/trophy.png" attribution="Illustration by Example Artist" />);
  expect(html).toContain("Illustration by Example Artist");
});

it("retains the licensed illustration attribution and license link", () => {
  const html = renderToStaticMarkup(<EditorialCard award title="Super Bowl" image={SUPER_BOWL_REFERENCE.canonical_image_url} attribution="BLTZ-provided reference artwork" />);
  expect(html).not.toContain("BLTZ-provided reference artwork");
  expect(html).toContain("Illustration by");
  expect(html).toContain('href="https://creativecommons.org/licenses/by-sa/4.0/"');
});
