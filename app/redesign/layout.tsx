import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Redesign mockup. Lives beside the production homepage until it ships.
// Fonts are self-hosted from @fontsource for the same reason as Roboto
// Condensed in the root layout: next/font/google is unreliable on Vercel builds.
const display = localFont({
  src: [
    { path: "../../node_modules/@fontsource/big-shoulders-display/files/big-shoulders-display-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../../node_modules/@fontsource/big-shoulders-display/files/big-shoulders-display-latin-800-normal.woff2", weight: "800", style: "normal" },
    { path: "../../node_modules/@fontsource/big-shoulders-display/files/big-shoulders-display-latin-900-normal.woff2", weight: "900", style: "normal" },
  ],
  variable: "--rd-font-display",
  display: "swap",
});

const text = localFont({
  src: [
    { path: "../../node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--rd-font-text",
  display: "swap",
});

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RedesignLayout({ children }: { children: ReactNode }) {
  return (
    <div data-redesign className={`${display.variable} ${text.variable}`}>
      {children}
    </div>
  );
}
