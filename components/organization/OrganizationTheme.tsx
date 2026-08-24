"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type OrganizationThemeMode = "bltz" | "school";
export type OrganizationThemeTone = "light" | "dark" | "team";

type OrganizationThemeValue = {
  mode: OrganizationThemeMode;
  tone: OrganizationThemeTone;
  accent: string;
  highlight: string;
  setMode: (mode: OrganizationThemeMode) => void;
  setReferenceTone: (tone: Exclude<OrganizationThemeTone, "team">) => void;
};

const BLTZ_ACCENT = "#2952ff";
const SAFE_SCHOOL_ACCENT = "#d6a500";

const fallback: OrganizationThemeValue = {
  mode: "bltz",
  tone: "light",
  accent: BLTZ_ACCENT,
  highlight: SAFE_SCHOOL_ACCENT,
  setMode: () => undefined,
  setReferenceTone: () => undefined,
};

const OrganizationThemeContext = createContext<OrganizationThemeValue>(fallback);

function safeColor(value: string | undefined, fallbackColor: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallbackColor;
}

export function OrganizationThemeProvider({
  children,
  initialTone = "light",
  schoolAccent,
  schoolHighlight,
}: {
  children: ReactNode;
  initialTone?: "light" | "dark";
  schoolAccent?: string;
  schoolHighlight?: string;
}) {
  const [mode, setModeState] = useState<OrganizationThemeMode>("bltz");
  const [referenceTone, setReferenceTone] = useState<"light" | "dark">(initialTone);

  useEffect(() => {
    const saved = window.localStorage.getItem("bltz-enterprise-theme");
    if (saved === "bltz" || saved === "school") setModeState(saved);
  }, []);

  const setMode = useCallback((nextMode: OrganizationThemeMode) => {
    setModeState(nextMode);
    window.localStorage.setItem("bltz-enterprise-theme", nextMode);
  }, []);

  const accent = mode === "school" ? safeColor(schoolAccent, SAFE_SCHOOL_ACCENT) : BLTZ_ACCENT;
  const highlight = mode === "school" ? safeColor(schoolHighlight, SAFE_SCHOOL_ACCENT) : SAFE_SCHOOL_ACCENT;
  const value = useMemo<OrganizationThemeValue>(() => ({
    mode,
    tone: referenceTone,
    accent,
    highlight,
    setMode,
    setReferenceTone,
  }), [accent, highlight, mode, referenceTone, setMode]);

  return <OrganizationThemeContext.Provider value={value}>{children}</OrganizationThemeContext.Provider>;
}

export function useOrganizationTheme() {
  return useContext(OrganizationThemeContext);
}

export function useReferencePageTone(tone: "light" | "dark") {
  const { mode, setReferenceTone, tone: activeTone } = useOrganizationTheme();
  useEffect(() => setReferenceTone(tone), [setReferenceTone, tone]);
  return mode === "bltz" ? tone : activeTone;
}
