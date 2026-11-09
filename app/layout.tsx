import { Geist, Oswald, Bebas_Neue, Open_Sans } from "next/font/google";
import localFont from "next/font/local";
import { ClientShell } from "./client-shell";
import "./globals.css";

export { metadata } from "./metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-oswald",
});

// Self-hosted: Google Fonts began returning Roboto Condensed file URLs that the
// build-time next/font/google loader cannot parse on Vercel, failing every build.
const robotoCondensed = localFont({
  src: [
    { path: "../node_modules/@fontsource/roboto-condensed/files/roboto-condensed-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/roboto-condensed/files/roboto-condensed-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-rc",
  display: "swap",
});

const barlowCondensed = localFont({
  src: [{ path: "../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2", weight: "700", style: "normal" }],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-open-sans",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${oswald.variable} ${robotoCondensed.variable} ${barlowCondensed.variable} ${bebasNeue.variable} ${openSans.variable}`}
    >
      <head>
        {/* Locker design type system — Barlow (body + heavy-weight display),
            JetBrains Mono (data). Referenced by literal family name in
            app/player/[slug]/LockerView.tsx inline styles. Barlow Condensed
            was dropped: its tight tracking overlapped characters at display
            sizes — Barlow at 700-900 covers display use instead. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen text-white antialiased bg-black">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
