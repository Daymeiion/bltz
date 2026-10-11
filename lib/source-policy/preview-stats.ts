import { equivalentPreview } from "@/lib/preview-lockers/validation";
import type { CfbImport } from "@/lib/preview-lockers/cfb-csv";
/** College imports remain retention-only. The user-authorized NFL sprint import
 * is validated separately as previewContent.pfr_stats, never a general source grant. */
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
