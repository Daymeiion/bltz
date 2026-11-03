"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Which accent the workspace uses: BLTZ blue or the school's own color. */
export type OrganizationThemeMode = "bltz" | "school";
/** What sits behind the cards: the school's color, or a quiet white. */
export type OrganizationCanvas = "school" | "white";

type OrganizationThemeValue = {
  mode: OrganizationThemeMode;
  canvas: OrganizationCanvas;
  accent: string;
  highlight: string;
  /** False when the server found no exact, contrast-safe school identity. */
  schoolAvailable: boolean;
  setMode: (mode: OrganizationThemeMode) => void;
  setCanvas: (canvas: OrganizationCanvas) => void;
};

const BLTZ_ACCENT = "#2952ff";
const SAFE_SCHOOL_ACCENT = "#d6a500";
const MODE_KEY = "bltz-enterprise-theme";
const CANVAS_KEY = "bltz-enterprise-canvas";

const fallback: OrganizationThemeValue = {
  mode: "bltz",
  canvas: "white",
  accent: BLTZ_ACCENT,
  highlight: SAFE_SCHOOL_ACCENT,
  schoolAvailable: true,
  setMode: () => undefined,
  setCanvas: () => undefined,
};

const OrganizationThemeContext = createContext<OrganizationThemeValue>(fallback);

function safeColor(value: string | undefined, fallbackColor: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallbackColor;
}

function readStored<T extends string>(key: string, allowed: readonly T[]): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return allowed.includes(value as T) ? value as T : null;
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* private mode: keep in memory only */ }
}

export function OrganizationThemeProvider({
  children,
  schoolAccent,
  schoolHighlight,
  schoolAvailable = true,
  defaultMode = "bltz",
  defaultCanvas = "white",
}: {
  children: ReactNode;
  schoolAccent?: string;
  schoolHighlight?: string;
  schoolAvailable?: boolean;
  defaultMode?: OrganizationThemeMode;
  defaultCanvas?: OrganizationCanvas;
}) {
  const [selectedMode, setModeState] = useState<OrganizationThemeMode>(defaultMode);
  const [canvas, setCanvasState] = useState<OrganizationCanvas>(defaultCanvas);
  const mode: OrganizationThemeMode = schoolAvailable ? selectedMode : "bltz";

  // Saved choices only exist in the browser, so they apply after hydration.
  useEffect(() => {
    const savedMode = readStored(MODE_KEY, ["bltz", "school"] as const);
    const savedCanvas = readStored(CANVAS_KEY, ["school", "white"] as const);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (savedMode) setModeState(savedMode);
    if (savedCanvas) setCanvasState(savedCanvas);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const setMode = useCallback((next: OrganizationThemeMode) => { setModeState(next); store(MODE_KEY, next); }, []);
  const setCanvas = useCallback((next: OrganizationCanvas) => { setCanvasState(next); store(CANVAS_KEY, next); }, []);

  const accent = mode === "school" ? safeColor(schoolAccent, SAFE_SCHOOL_ACCENT) : BLTZ_ACCENT;
  const highlight = mode === "school" ? safeColor(schoolHighlight, SAFE_SCHOOL_ACCENT) : SAFE_SCHOOL_ACCENT;
  const value = useMemo<OrganizationThemeValue>(
    () => ({ mode, canvas, accent, highlight, schoolAvailable, setMode, setCanvas }),
    [accent, canvas, highlight, mode, schoolAvailable, setCanvas, setMode],
  );

  return <OrganizationThemeContext.Provider value={value}>{children}</OrganizationThemeContext.Provider>;
}

export function useOrganizationTheme() {
  return useContext(OrganizationThemeContext);
}
