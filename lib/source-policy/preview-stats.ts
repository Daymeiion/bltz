import { equivalentPreview } from "@/lib/preview-lockers/validation";
import type { CfbImport } from "@/lib/preview-lockers/cfb-csv";
/** Manual imports have no approved ingestion capability; existing entries may only be retained or removed. */
export function canSaveStatsImports(next: CfbImport[], saved: CfbImport[] = []): boolean {
  const remaining = [...saved];
  return next.every(item => {
    const match = remaining.findIndex(previous => equivalentPreview(item, previous));
    if (match < 0) return false;
    // A saved entry can be retained only once, even when duplicate legacy entries exist.
    remaining.splice(match, 1);
    return true;
  });
}
