import { z } from "zod";
import type { ImageCandidate, ImageEntityIdentity, ImageEntityReference, ImageMatchContext, ImageMatchResult } from "./contracts";

function comparable(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
function sameName(a: string | null, b: string): boolean {
  return a !== null && comparable(a).split(" ").sort().join(" ") === comparable(b).split(" ").sort().join(" ");
}
function sameIdentity(a: ImageEntityIdentity, b: ImageEntityIdentity): boolean {
  if (!a.sport || !b.sport || a.origin !== b.origin || a.sport !== b.sport || a.id !== b.id) return false;
  if (a.origin === "SD" && !z.string().uuid().safeParse(a.id).success) return false;
  if (a.origin === "SR" && !/^sr:[a-z_]+:\d+$/.test(a.id)) return false;
  return true;
}
function scopedReferences(candidate: ImageCandidate, type: string) {
  return candidate.references.filter(ref => ref.type === type && ref.scopeSport === candidate.league);
}
function matching(ref: ImageEntityReference, expected: ImageEntityIdentity[]) {
  return ref.identities.some(identity => expected.some(mapping => sameIdentity(identity, mapping)));
}
function contradictory(ref: ImageEntityReference, expected: ImageEntityIdentity[]) {
  // A reference cannot name two IDs in one identifier system as one entity.
  return expected.some(mapping => {
    const sameScope = ref.identities.filter(id => id.origin === mapping.origin && id.sport === mapping.sport);
    return new Set(sameScope.map(id => id.id)).size > 1;
  });
}

/** Links are candidate evidence, not approval. Athlete identity alone never links a Moment/Signal. */
export function matchImageCandidate(candidate: ImageCandidate, context: ImageMatchContext): ImageMatchResult {
  z.string().uuid().parse(context.athleteId);
  if (context.reviewedCaptionDate) z.iso.date().parse(context.reviewedCaptionDate);
  if (context.athleteIdentities.length > 0 && !context.athleteIdentities.some(id => id.sport === candidate.league)) {
    return { athlete: { status: "unmatched", athleteId: null, reasons: ["Manifest league differs from all supplied verified athlete identity scopes."] },
      moments: context.moments.map(moment => ({ momentId: moment.momentId, status: "unmatched", signalIds: [], reasons: ["Wrong league scope; names cannot override the identifier namespace."] })),
      rightsStatus: "unknown", publicationAllowed: false };
  }
  const profiles = scopedReferences(candidate, "profile");
  const explicitProfiles = profiles.filter(ref => matching(ref, context.athleteIdentities));
  const namedProfiles = profiles.filter(ref => sameName(ref.name, context.athleteName));
  const identityConflict = explicitProfiles.some(ref => contradictory(ref, context.athleteIdentities)
    || (ref.name !== null && !sameName(ref.name, context.athleteName)))
    || namedProfiles.some(ref => ref.identities.some(identity => context.athleteIdentities.some(mapping =>
      identity.origin === mapping.origin && identity.sport === mapping.sport && identity.id !== mapping.id)));
  const caption = comparable(`${candidate.title} ${candidate.caption ?? ""}`);
  const name = comparable(context.athleteName);
  const nameMention = namedProfiles.length > 0 || (name.length > 0 && ` ${caption} `.includes(` ${name} `));
  const athlete: ImageMatchResult["athlete"] = identityConflict
    ? { status: "conflict", athleteId: null, reasons: ["Profile reference contains conflicting scoped athlete IDs."] }
    : explicitProfiles.length > 0
      ? { status: "evidence_supported", athleteId: context.athleteId, reasons: ["Explicit profile identity matches a supplied verified mapping with the same origin and league scope."] }
      : nameMention
        ? { status: "review_required", athleteId: null, reasons: ["Name or caption is a review clue; no exact verified profile reference matches."] }
        : { status: "unmatched", athleteId: null, reasons: ["No scoped profile identity or athlete-name clue matches."] };
  const events = scopedReferences(candidate, "event");
  const moments = context.moments.map(moment => {
    z.string().uuid().parse(moment.momentId);
    if (moment.occurredOn) z.iso.date().parse(moment.occurredOn);
    const base = { momentId: moment.momentId, signalIds: [] as string[] };
    if (moment.athleteId !== context.athleteId) return { ...base, status: "unmatched" as const, reasons: ["Moment belongs to another canonical athlete."] };
    if (athlete.status === "conflict") return { ...base, status: "conflict" as const, reasons: athlete.reasons };
    const exactEvents = events.filter(ref => matching(ref, moment.eventIdentities));
    const conflictingEvent = exactEvents.some(ref => contradictory(ref, moment.eventIdentities))
      || (exactEvents.length > 0 && events.some(ref => ref.identities.some(identity => moment.eventIdentities.some(mapping =>
        identity.origin === mapping.origin && identity.sport === mapping.sport && identity.id !== mapping.id))));
    const conflictingDate = !!(context.reviewedCaptionDate && moment.occurredOn && context.reviewedCaptionDate !== moment.occurredOn);
    if (conflictingEvent || (exactEvents.length > 0 && conflictingDate)) return { ...base, status: "conflict" as const,
      reasons: [conflictingEvent ? "Manifest references conflicting events in the same identifier scope." : "Independently reviewed caption date conflicts with the Moment date."] };
    if (athlete.status === "evidence_supported" && exactEvents.length > 0) return { ...base,
      status: "evidence_supported" as const, signalIds: [...new Set(moment.signalIds)],
      reasons: ["Both athlete and event have explicit matching scoped identities. Publication and graph promotion still require separate review."] };
    if (conflictingDate) return { ...base, status: "unmatched" as const, reasons: ["Reviewed caption date differs; created/update/publish dates cannot override it."] };
    if ((athlete.status === "evidence_supported" || athlete.status === "review_required")
      && (exactEvents.length > 0 || (context.reviewedCaptionDate && context.reviewedCaptionDate === moment.occurredOn))) {
      return { ...base, status: "review_required" as const,
        reasons: ["Some context is compatible, but exact scoped athlete and event references are both required for a supported Moment association."] };
    }
    return { ...base, status: "unmatched" as const, reasons: ["Athlete-only association and asset metadata dates do not establish this Moment or its Signals."] };
  });
  return { athlete, moments, rightsStatus: "unknown", publicationAllowed: false };
}
