import type { PreviewContent } from "./validation";

// Discovery never overwrites work an operator has entered. Suggestions fill
// only empty fields/collections; all results still require explicit review.
export function mergeSuggestions(current: PreviewContent, suggestion: PreviewContent): PreviewContent {
  const merged = { ...current };
  for (const key of Object.keys(current) as (keyof PreviewContent)[]) {
    const value = current[key];
    if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      Object.assign(merged, { [key]: suggestion[key] });
    }
  }
  return merged;
}
