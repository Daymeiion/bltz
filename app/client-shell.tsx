"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { Navbar } from "@/components/ui/navbar";

export function ClientShell({ children }: Readonly<{ children: React.ReactNode }>) {
  // The onboarding flow has its own broadcast-shell chrome and a custom
  // step indicator — the global navbar would compete with both. Hide it
  // whenever the user is anywhere under /onboarding.
  //
  // The player locker (/player/[slug]) is a full-bleed fan-facing page with
  // its own glass topbar (brand + search + avatar). The global navbar would
  // duplicate that chrome, so hide it on locker routes too.
  const pathname = usePathname();
  const isOnboarding = pathname?.startsWith("/onboarding") ?? false;
  const isLocker = pathname?.startsWith("/player/") ?? false;
  const hideChrome = isOnboarding || isLocker;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {!hideChrome && <Navbar />}
      {children}
    </ThemeProvider>
  );
}
