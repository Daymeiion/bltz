import type { IntendedUse } from "./contracts";

export interface LegacyPermissionAsset {
  model: "legacy_media" | "legacy_video";
  associationReviewed: boolean;
  athleteRelationshipVerified: boolean;
  kind: string;
  licenseStatus: string | null;
  publicLockerApproved: boolean;
  licenseKind: string | null;
}
export interface MediaPermissionDecision {
  allowed: boolean;
  basis: "legacy_display_compatibility" | "unavailable";
  reason: "legacy_display_approved" | "reviewed_relationship_required" | "current_display_approval_required" | "intended_use_rights_adapter_unavailable";
}

/** Central intended-use boundary for workflow adapters. Subscription/provider
 * access and reviewed associations never establish commercial or publishing rights.
 */
export function resolveMediaPermissions(asset: LegacyPermissionAsset, usageContext: IntendedUse): MediaPermissionDecision {
  if (!asset.associationReviewed || !asset.athleteRelationshipVerified) return {
    allowed: false, basis: "unavailable", reason: "reviewed_relationship_required",
  };
  if (usageContext !== "internal_review" && usageContext !== "public_display") return {
    allowed: false, basis: "unavailable", reason: "intended_use_rights_adapter_unavailable",
  };
  const allowed = asset.model === "legacy_media" && ["photo", "headshot", "video"].includes(asset.kind)
    && asset.licenseStatus === "approved" && asset.publicLockerApproved && !!asset.licenseKind?.trim();
  return { allowed, basis: allowed ? "legacy_display_compatibility" : "unavailable",
    reason: allowed ? "legacy_display_approved" : "current_display_approval_required" };
}
