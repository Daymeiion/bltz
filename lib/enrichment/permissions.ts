import { isPreviewUrl } from "@/lib/preview-lockers/validation";
import type { CatalogAward } from "./awards";

/** Narrow reference-asset adapter for the conceptual media permission API.
 * This is not the future Media Graph rights engine. */
export type AwardArtworkContext = "preview_award" | "preview_demo_award";
export function resolveMediaPermissions(asset: Pick<CatalogAward,"active"|"asset_status"|"canonical_image_url"|"image_source_url"|"image_license"|"attribution">, usageContext: AwardArtworkContext) {
  // Preview demo artwork is chosen by an Admin and needs no source or review step.
  if (usageContext === "preview_demo_award") {
    const allowed = asset.active && !!asset.canonical_image_url && isPreviewUrl(asset.canonical_image_url);
    return { canDisplay: allowed, imageUrl: allowed ? asset.canonical_image_url : null };
  }
  const allowed = usageContext === "preview_award" && asset.active && asset.asset_status === "approved"
    && !!asset.canonical_image_url && isPreviewUrl(asset.canonical_image_url)
    && !!asset.image_source_url && isPreviewUrl(asset.image_source_url)
    && !!asset.image_license?.trim() && !!asset.attribution?.trim();
  return { canDisplay: allowed, imageUrl: allowed ? asset.canonical_image_url : null };
}
