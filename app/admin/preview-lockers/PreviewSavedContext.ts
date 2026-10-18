"use client";

import { createContext } from "react";

// Keeps the header link in sync without reloading or discarding the editor.
export const PreviewSavedContext = createContext<((slug: string) => void) | null>(null);
