"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type OrganizationThemeMode = "reference" | "light" | "dark" | "team";
export type OrganizationThemeTone = "light" | "dark" | "team";

type OrganizationThemeValue = {
  mode: OrganizationThemeMode;
  tone: OrganizationThemeTone;
  accent: string;
  setMode: (mode: OrganizationThemeMode) => void;
  setReferenceTone: (tone: Exclude<OrganizationThemeTone, "team">) => void;
};

const fallback: OrganizationThemeValue = {
  mode: "reference",
  tone: "light",
  accent: "#ffbb00",
  setMode: () => undefined,
  setReferenceTone: () => undefined,
};

const OrganizationThemeContext = createContext<OrganizationThemeValue>(fallback);

export function OrganizationThemeProvider({ children, initialTone }: { children: ReactNode; initialTone: "light" | "dark" }) {
  const [mode, setModeState] = useState<OrganizationThemeMode>("reference");
  const [referenceTone, setReferenceTone] = useState<"light" | "dark">(initialTone);

  useEffect(() => {
    const saved = window.localStorage.getItem("bltz-organization-theme");
    if (saved === "reference" || saved === "light" || saved === "dark" || saved === "team") setModeState(saved);
  }, []);

  const setMode = useCallback((nextMode: OrganizationThemeMode) => {
    setModeState(nextMode);
    window.localStorage.setItem("bltz-organization-theme", nextMode);
  }, []);

  const value = useMemo<OrganizationThemeValue>(() => ({
    mode,
    tone: mode === "reference" ? referenceTone : mode,
    accent: "#ffbb00",
    setMode,
    setReferenceTone,
  }), [mode, referenceTone, setMode]);

  return <OrganizationThemeContext.Provider value={value}>{children}</OrganizationThemeContext.Provider>;
}

export function useOrganizationTheme() {
  return useContext(OrganizationThemeContext);
}

export function useReferencePageTone(tone: "light" | "dark") {
  const { mode, setReferenceTone, tone: activeTone } = useOrganizationTheme();
  useEffect(() => setReferenceTone(tone), [setReferenceTone, tone]);
  return mode === "reference" ? tone : activeTone;
}
