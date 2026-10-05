import type { IntelligenceContentItem } from "./content";
import type { AthleteSummary, LabMedia, LabResult, LabSection } from "./lab-types";

export type WorkspaceAthleteSummary = AthleteSummary & {
  teamLabel: string | null;
  portraitUrl: string | null;
  priority: number | null;
  priorityLabel: "High" | "Mid" | "Low" | "Awaiting review";
  hasIntelligence: boolean;
  intelligenceState: "ready" | "incomplete";
};

export type WorkspaceProfile = {
  athleteId: string;
  portraitUrl: string | null;
  portraitSource: string | null;
  portraitAttribution: {
    creator: string | null;
    owner: string | null;
    credits: string | null;
    sourceUrl: string | null;
    license: string | null;
  };
  status: string | null;
  statusDate: string | null;
  statusDatePrecision: "day" | "year" | "unknown";
  sport: string | null;
  email: null;
  phone: null;
  socialLinks: Array<{ label: string; url: string }>;
  lockerHref: string | null;
};

export type WorkspaceMedia = LabMedia & {
  previewUrl: string | null;
  sourceUrl: string | null;
  credits: string | null;
  publicationStatus: string;
  permissionReason: string;
  /** No Moment association is inferred from an athlete/media relationship. */
  momentIds: string[];
};

/** Only authorized, serializable metadata; provider payloads and secrets stay server-side. */
export type WorkspaceResult = {
  result: Omit<LabResult, "search"> & { search: LabSection<WorkspaceAthleteSummary> };
  directory: LabSection<WorkspaceAthleteSummary>;
  profile: WorkspaceProfile | null;
  profileState: "ready" | "unavailable";
  media: LabSection<WorkspaceMedia>;
  mediaPreviewState: "ready" | "unavailable";
  content: LabSection<IntelligenceContentItem>;
  momentMediaState: "not_supported";
};

export type IntelligenceWorkspaceData = WorkspaceResult;
