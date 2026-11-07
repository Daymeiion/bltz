import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

// Redesign mockup. Lives beside the production homepage until it ships.
// Fonts are self-hosted from @fontsource for the same reason as Roboto
// Condensed in the root layout: next/font/google is unreliable on Vercel builds.
// Headings: Barlow Condensed Bold. Body: Barlow. Numbers: JetBrains Mono.
const display = localFont({
  src: [
    { path: "../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--rd-font-display",
  display: "swap",
});

const text = localFont({
  src: [
    { path: "../../node_modules/@fontsource/barlow/files/barlow-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../node_modules/@fontsource/barlow/files/barlow-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../node_modules/@fontsource/barlow/files/barlow-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../node_modules/@fontsource/barlow/files/barlow-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--rd-font-text",
  display: "swap",
});

const mono = localFont({
  src: [
    { path: "../../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--rd-font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RedesignLayout({ children }: { children: ReactNode }) {
  return (
    <div data-redesign className={`${display.variable} ${text.variable} ${mono.variable}`}>
      {children}
    </div>
  );
}
