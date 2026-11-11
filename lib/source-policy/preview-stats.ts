import { evaluateSource } from "./policy";
import { equivalentPreview } from "@/lib/preview-lockers/validation";
import type { CfbImport } from "@/lib/preview-lockers/cfb-csv";
/** Existing restricted records may be retained or removed, never expanded by a save. */
export function canSaveStatsImports(next: CfbImport[], saved: CfbImport[] = []): boolean {
  return next.every(item => evaluateSource(item.sourceUrl).allowed_actions.includes("PERSIST_FACTS")
    || saved.some(previous => equivalentPreview(item, previous)));
}
