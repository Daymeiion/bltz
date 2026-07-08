"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { Navbar } from "@/components/ui/navbar";

export function ClientShell({ children }: Readonly<{ children: React.ReactNode }>) {
  // The onboarding flow has its own broadcast-shell chrome and a custom
  // step indicator — the global navbar would compete with both. The fan-facing
  // player locker is a self-contained app screen with its own top app bar and
  // bottom nav, so the global navbar is hidden there too. Hide it whenever the
  // user is anywhere under /onboarding or /player.
  const pathname = usePathname();
  const hideNavbar =
    (pathname?.startsWith("/onboarding") ?? false) ||
    (pathname?.startsWith("/player") ?? false);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {!hideNavbar && <Navbar />}
      {children}
    </ThemeProvider>
  );
}
