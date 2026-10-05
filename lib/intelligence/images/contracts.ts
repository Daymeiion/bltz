import type { GraphSourceReference } from "../contracts";

/** Identifier origin and league scope are part of identity, never interchangeable. */
export interface ImageEntityIdentity {
  origin: string;
  sport: string | null;
  id: string;
}

export interface ImageEntityReference {
  type: string;
  name: string | null;
  scopeSport: string | null;
  identities: ImageEntityIdentity[];
  legacySportradarId: string | null;
}

export interface ImageCandidate {
  externalAssetId: string;
  publisher: string;
  publisherAssetId: string | null;
  sport: string;
  league: string;
  kind: string;
  title: string;
  caption: string | null;
  copyright: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  originalPublishedAt: string | null;
  references: ImageEntityReference[];
  renditions: Array<{ locator: string; width: number; height: number }>;
  source: GraphSourceReference;
  sourcePointer: string;
  rightsStatus: "unknown";
  reviewStatus: "candidate";
}

export interface ImagesManifestContext {
  transportProvider: string;
  publisher: string;
  sport: string;
  league: string;
  sourceLocator: string;
  fetchedAt: string;
}

export interface ImagesNormalizationResult {
  assets: ImageCandidate[];
  manifestUpdatedAt: string | null;
  issues: Array<{ code: string; assetIndex: number | null }>;
}

export interface ImageMatchContext {
  /** Canonical ID/mappings must already have been verified by the caller. */
  athleteId: string;
  athleteName: string;
  athleteIdentities: ImageEntityIdentity[];
  moments: Array<{
    momentId: string;
    athleteId: string;
    occurredOn: string | null;
    eventIdentities: ImageEntityIdentity[];
    signalIds: string[];
  }>;
  /** Optional independently reviewed caption date. Never set from created/publish metadata. */
  reviewedCaptionDate?: string;
}

export type ImageAssociationStatus = "evidence_supported" | "review_required" | "unmatched" | "conflict";
export interface ImageMatchResult {
  athlete: { status: ImageAssociationStatus; athleteId: string | null; reasons: string[] };
  moments: Array<{ momentId: string; status: ImageAssociationStatus; signalIds: string[]; reasons: string[] }>;
  rightsStatus: "unknown";
  publicationAllowed: false;
}
