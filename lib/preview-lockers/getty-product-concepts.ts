// Meeting concepts only: these are not purchasable products or rights grants.
export type ProductConcept = {
  id: string;
  title: string;
  image: string;
  alt: string;
  description: string;
  estimatedPriceUsd: number;
  sources: { id: string; url: string }[];
};

const asset = (id: string) => ({ id, url: `https://www.gettyimages.com/detail/${id}` });
const image = (name: string) => `/images/dante-hughes/product-concepts/${name}.webp`;

export const DANTE_PRODUCT_CONCEPTS: readonly ProductConcept[] = [
  {
    id: "framed-print", title: "Framed print", image: image("framed-print"),
    alt: "Black framed print of Dante Hughes covering a receiver, with a white mat",
    description: "A career moment, framed. Black wood frame with an archival-style print and white mat, approximately 16 × 20 inches.",
    estimatedPriceUsd: 89, sources: [asset("82679329")],
  },
  {
    id: "signed-poster", title: "Signed poster", image: image("signed-poster"),
    alt: "California action poster with a silver Dante Hughes concept autograph",
    description: "An 18 × 24 inch action poster. The signature shown is a concept facsimile, not an authenticated autograph.",
    estimatedPriceUsd: 129, sources: [asset("599195822")],
  },
  {
    id: "photo-pillow", title: "Photo pillow", image: image("photo-pillow"),
    alt: "Throw pillow printed with Dante Hughes breaking up a pass for Indianapolis",
    description: "An 18 × 18 inch throw pillow with an edge-to-edge career photograph and woven fabric finish.",
    estimatedPriceUsd: 39, sources: [asset("76443769")],
  },
  {
    id: "sticker-set", title: "Sticker set · 3 stickers", image: image("sticker-set"),
    alt: "Set of exactly three die-cut photo stickers from Dante Hughes’s college and professional career",
    description: "Three vinyl photo stickers with white die-cut borders, approximately 3–4 inches each. Three moments in one set.",
    estimatedPriceUsd: 12, sources: [asset("106613403"), asset("77549351"), asset("51458178")],
  },
  {
    id: "fan-face-cutout", title: "Fan face cutout", image: image("fan-face-cutout-kid"),
    alt: "A child holding a large head-only cutout poster of Dante Hughes’s face at a stadium",
    description: "A young fan holding a 24 inch, head-only face poster. A lightweight rigid cutout with a white silhouette border.",
    estimatedPriceUsd: 49, sources: [asset("113640536")],
  },
];
