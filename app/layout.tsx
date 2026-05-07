import { Geist, Oswald, Roboto_Condensed, Bebas_Neue, Open_Sans } from "next/font/google";
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

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-rc",
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
      className={`${geistSans.variable} ${oswald.variable} ${robotoCondensed.variable} ${bebasNeue.variable} ${openSans.variable}`}
    >
      <body className="min-h-screen text-white antialiased bg-black">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
