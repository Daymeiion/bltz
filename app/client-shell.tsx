"use client";

import { ThemeProvider } from "next-themes";
import { Navbar } from "@/components/ui/navbar";

export function ClientShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Navbar />
      {children}
    </ThemeProvider>
  );
}
