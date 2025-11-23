"use client";
import type { Metadata } from "next";
import { Geist, Oswald, Roboto_Condensed, Bebas_Neue, Open_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/ui/navbar";
import "./globals.css";
import "react-image-lightbox/style.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

// Note: Metadata moved to separate file since this is now a client component

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
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const shouldShow = currentScrollY > 0;
      
      console.log('Scroll position:', currentScrollY, 'Should show background:', shouldShow);
      setIsScrolling(shouldShow);
    };

    // Initial check
    handleScroll();

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${oswald.variable} ${robotoCondensed.variable} ${bebasNeue.variable} ${openSans.variable}`}
    >
      <body className="min-h-screen text-white antialiased bg-black">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* 🔽 Navigation bar */}
          <Navbar />

          {/* 🔽 Page content */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
