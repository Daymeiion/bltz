"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { Navbar } from "@/components/ui/navbar";

export function ClientShell({ children }: Readonly<{ children: React.ReactNode }>) {
  // The onboarding flow has its own broadcast-shell chrome and a custom
  // step indicator — the global navbar would compete with both. Hide it
  // whenever the user is anywhere under /onboarding.
  const pathname = usePathname();
  const isOnboarding = pathname?.startsWith("/onboarding") ?? false;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {!isOnboarding && <Navbar />}
      {children}
    </ThemeProvider>
  );
}
