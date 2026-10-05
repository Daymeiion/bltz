import type { Metadata } from "next";

// Override the private preview layout only for Film Room. Cross-origin
// embeds receive the origin, never the private slug or query string.
export const metadata: Metadata = { referrer: "strict-origin-when-cross-origin" };

export default function FilmRoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
