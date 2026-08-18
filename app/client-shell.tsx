"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { Navbar } from "@/components/ui/navbar";

export function ClientShell({ children }: Readonly<{ children: React.ReactNode }>) {
  // The onboarding flow has its own broadcast-shell chrome and a custom
  // step indicator — the global navbar would compete with both. The fan-facing
  // player locker is a self-contained app screen with its own top app bar and
  // bottom nav, so the global navbar is hidden there too. Auth and admin
  // surfaces are internal sign-in or operations screens, not the logged-in
  // dashboard chrome. Hide the navbar on those routes.
  const pathname = usePathname();
  const hideNavbar =
    pathname === "/" ||
    (pathname?.startsWith("/onboarding") ?? false) ||
    (pathname?.startsWith("/player") ?? false) ||
    (pathname?.startsWith("/admin") ?? false) ||
    (pathname?.startsWith("/auth") ?? false);

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
