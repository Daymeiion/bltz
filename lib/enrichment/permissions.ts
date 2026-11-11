import { isPreviewUrl } from "@/lib/preview-lockers/validation";
import type { CatalogAward } from "./awards";

/** Narrow reference-asset adapter for the conceptual media permission API.
 * This is not the future Media Graph rights engine. */
export function resolveMediaPermissions(asset: CatalogAward, usageContext: "preview_award") {
  const allowed = usageContext === "preview_award" && asset.active && asset.asset_status === "approved"
    && !!asset.canonical_image_url && isPreviewUrl(asset.canonical_image_url)
    && !!asset.image_source_url && isPreviewUrl(asset.image_source_url)
    && !!asset.image_license?.trim() && !!asset.attribution?.trim();
  return { canDisplay: allowed, imageUrl: allowed ? asset.canonical_image_url : null };
}
