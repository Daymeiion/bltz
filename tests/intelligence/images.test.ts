import { describe, expect, it } from "vitest";
import { normalizeImagesManifest } from "@/lib/intelligence/images/normalize";
import { matchImageCandidate } from "@/lib/intelligence/images/match";
import type { ImageMatchContext } from "@/lib/intelligence/images/contracts";

// Synthetic photo manifest modeled on the official JSON example; no real photo,
// Getty entitlement, licensing or existing graph-media link is asserted.
const athleteId = "c5dae871-a277-4256-9a0c-17a40940ad3f";
const providerPlayerId = "d2c5d2fa-dd75-444e-b8e0-63c31a3791be";
const eventId = "eb3bb333-6ae5-417c-b9e3-1d3dfdb8673e";
const uscMomentId = "24395222-ee28-4a8b-9c1e-e5f06e0dd705";
const nflMomentId = "dbef2bf5-eea9-4920-94dc-18851eec4254";
const normalization = { transportProvider: "sportradar", publisher: "getty", sport: "football", league: "nfl",
  sourceLocator: `/nfl-images-t3/getty/actionshots/events/game/${eventId}/manifest.json`, fetchedAt: "2026-10-01T12:00:00Z" };
const reference = (type: string, id: string, name: string) => ({ type, name, sport: "nfl", sportradar_id: id,
  entity_ids: [{ origin: "SD", sport: "nfl", id }] });
function manifest() {
  return { provider: "getty", league: "nfl", type: "actionshot", manifest_date: "2026-10-01T10:00:00Z", trial: true,
    assetlist: [{ id: "synthetic-image-1", title: "Synthetic Keith Rivers photo", description: "Synthetic NFL photo caption, not a real archive result.",
      created: "2026-10-01T09:00:00Z", updated: "2026-10-01T10:00:00Z", copyright: "Synthetic rights-holder label",
      provider: { name: "getty", provider_item_id: "synthetic-publisher-image-1", original_publish: "2014-09-08T00:00:00Z" },
      links: [{ width: 500, height: 333, href: "/actionshots/events/2014/9/8/synthetic-image-1/h500.jpg" }],
      refs: [reference("profile", providerPlayerId, "Rivers, Keith"), reference("event", eventId, "Synthetic Bills/Bears event reference")] }] };
}
const context = (): ImageMatchContext => ({ athleteId, athleteName: "Keith Rivers", athleteIdentities: [{ origin: "SD", sport: "nfl", id: providerPlayerId }],
  moments: [{ momentId: uscMomentId, athleteId, occurredOn: "2006-10-07", eventIdentities: [], signalIds: ["synthetic-usc-anniversary-signal"] },
    { momentId: nflMomentId, athleteId, occurredOn: "2014-09-07", eventIdentities: [{ origin: "SD", sport: "nfl", id: eventId }], signalIds: [] }] });
const normalize = (raw = manifest()) => normalizeImagesManifest(raw, normalization).assets[0];

describe("metadata-only Images manifest normalization", () => {
  it("parses the official root assetlist-array shape and preserves independent dates and IDs", () => {
    const item = normalize();
    expect(item).toMatchObject({ externalAssetId: "synthetic-image-1", publisherAssetId: "synthetic-publisher-image-1",
      createdAt: "2026-10-01T09:00:00Z", updatedAt: "2026-10-01T10:00:00Z", originalPublishedAt: "2014-09-08T00:00:00Z",
      sourcePointer: "/assetlist/0", rightsStatus: "unknown", reviewStatus: "candidate" });
    expect(item.source.locator).toBe(normalization.sourceLocator);
    expect(item.references[0].identities[0]).toEqual({ origin: "SD", sport: "nfl", id: providerPlayerId });
    expect(item).not.toHaveProperty("occurredOn");
  });
  it("supports another publisher without provider-native canonical fields", () => {
    const raw = manifest(); raw.provider = "ap"; raw.assetlist[0].provider.name = "ap";
    expect(normalizeImagesManifest(raw, { ...normalization, publisher: "ap" }).assets[0].publisher).toBe("ap");
  });
  it("does not invent missing dates or rendition URLs", () => {
    const raw = manifest();
    const { created: _created, updated: _updated, links: _links, ...asset } = raw.assetlist[0];
    const { original_publish: _publish, ...provider } = asset.provider;
    const result = normalizeImagesManifest({ ...raw, assetlist: [{ ...asset, provider }] }, normalization);
    expect(result.assets[0]).toMatchObject({ createdAt: null, updatedAt: null, originalPublishedAt: null, renditions: [] });
  });
  it("accepts an explicitly empty assetlist but rejects an invented wrapper shape", () => {
    expect(normalizeImagesManifest({ ...manifest(), assetlist: [] }, normalization).assets).toEqual([]);
    expect(() => normalizeImagesManifest({ assetlist: { assets: [] } }, normalization)).toThrow();
  });
  it("rejects a wrong publisher or league instead of relabeling it", () => {
    expect(() => normalizeImagesManifest({ ...manifest(), league: "nba" }, normalization)).toThrow("manifest_scope_conflict");
    expect(() => normalizeImagesManifest({ ...manifest(), provider: "ap" }, normalization)).toThrow("manifest_scope_conflict");
  });
  it("rejects duplicate asset IDs without arbitrarily choosing the first candidate", () => {
    const raw = manifest(); raw.assetlist.push({ ...raw.assetlist[0], title: "Conflicting synthetic duplicate" });
    const result = normalizeImagesManifest(raw, normalization);
    expect(result.assets).toHaveLength(0); expect(result.issues[0].code).toBe("duplicate_external_asset_id");
  });
  it.each(["https://user:secret@host.test/a.jpg", "/a.jpg?api_key=secret", "//host.test/a.jpg", "http://host.test/a.jpg"])("discards unsafe rendition locator %s", href => {
    const raw = manifest(); raw.assetlist[0].links[0].href = href;
    const result = normalizeImagesManifest(raw, normalization);
    expect(result.assets).toEqual([]); expect(result.issues[0].code).toBe("malformed_asset_metadata");
  });
  it("rejects authenticated manifest evidence URLs", () => {
    expect(() => normalizeImagesManifest(manifest(), { ...normalization, sourceLocator: normalization.sourceLocator + "?api_key=secret" })).toThrow();
  });
  it("isolates malformed dates or inconsistent asset publishers", () => {
    const raw = manifest(); raw.assetlist[0].created = "not-a-date";
    expect(normalizeImagesManifest(raw, normalization).assets).toEqual([]);
    raw.assetlist[0].created = "2026-10-01T09:00:00Z"; raw.assetlist[0].provider.name = "ap";
    expect(normalizeImagesManifest(raw, normalization).issues[0].code).toBe("asset_publisher_conflict");
  });
});

describe("conservative image-to-athlete and Moment candidates", () => {
  it("supports only the exact athlete+event pair and does not attach the USC anniversary", () => {
    const result = matchImageCandidate(normalize(), context());
    expect(result.athlete).toMatchObject({ status: "evidence_supported", athleteId });
    expect(result.moments.find(m => m.momentId === nflMomentId)).toMatchObject({ status: "evidence_supported", signalIds: [] });
    expect(result.moments.find(m => m.momentId === uscMomentId)).toMatchObject({ status: "unmatched", signalIds: [] });
    expect(result).toMatchObject({ rightsStatus: "unknown", publicationAllowed: false });
  });
  it("can carry a Signal only through its independently matched Moment", () => {
    const c = context(); c.moments[1].signalIds = ["synthetic-nfl-signal"];
    const result = matchImageCandidate(normalize(), c);
    expect(result.moments[1].signalIds).toEqual(["synthetic-nfl-signal"]);
    expect(result.moments[0].signalIds).toEqual([]);
  });
  it("keeps name/caption alone in review and emits no Moment Signals", () => {
    const raw = manifest(); raw.assetlist[0].refs = [];
    const result = matchImageCandidate(normalize(raw), { ...context(), reviewedCaptionDate: "2014-09-07" });
    expect(result.athlete.status).toBe("review_required");
    expect(result.athlete.athleteId).toBeNull();
    expect(result.moments[1]).toMatchObject({ status: "review_required", signalIds: [] });
  });
  it("does not interpret creation or publication dates as the photographed event", () => {
    const raw = manifest(); raw.assetlist[0].refs = [raw.assetlist[0].refs[0]];
    raw.assetlist[0].created = "2014-09-07T00:00:00Z"; raw.assetlist[0].provider.original_publish = "2014-09-07T00:00:00Z";
    expect(matchImageCandidate(normalize(raw), context()).moments[1].status).toBe("unmatched");
  });
  it("does not substitute legacy or SR IDs for a scoped SD identity", () => {
    const item = normalize(); item.references[0].identities = [];
    expect(matchImageCandidate(item, context()).athlete.status).toBe("review_required");
    item.references[0].identities = [{ origin: "SR", sport: "nfl", id: providerPlayerId }];
    expect(matchImageCandidate(item, context()).athlete.status).toBe("review_required");
  });
  it("matches an SR namespace only when an independently verified SR mapping is supplied", () => {
    const item = normalize(); item.references[0].identities = [{ origin: "SR", sport: "nfl", id: "sr:player:832601" }];
    const result = matchImageCandidate(item, { ...context(), athleteIdentities: [{ origin: "SR", sport: "nfl", id: "sr:player:832601" }] });
    expect(result.athlete.status).toBe("evidence_supported");
  });
  it("does not match a missing identity sport or a reference from another league", () => {
    const item = normalize(); item.references[0].identities[0].sport = null;
    expect(matchImageCandidate(item, context()).athlete.status).toBe("review_required");
    item.league = "nba";
    expect(matchImageCandidate(item, context()).athlete.status).toBe("unmatched");
  });
  it("blocks conflicting scoped athlete IDs and name/ID disagreement", () => {
    const item = normalize(); item.references[0].identities.push({ origin: "SD", sport: "nfl", id: eventId });
    expect(matchImageCandidate(item, context()).athlete.status).toBe("conflict");
    item.references[0].identities.pop(); item.references[0].name = "Philip Rivers";
    expect(matchImageCandidate(item, context()).athlete.status).toBe("conflict");
  });
  it("blocks ambiguous same-scope event references", () => {
    const item = normalize(); item.references[1].identities.push({ origin: "SD", sport: "nfl", id: providerPlayerId });
    expect(matchImageCandidate(item, context()).moments[1]).toMatchObject({ status: "conflict", signalIds: [] });
  });
  it("requires review when athlete is exact but event metadata is absent", () => {
    const item = normalize(); item.references = [item.references[0]];
    expect(matchImageCandidate(item, { ...context(), reviewedCaptionDate: "2014-09-07" }).moments[1].status).toBe("review_required");
  });
  it("blocks independently reviewed caption-date disagreement without using publication time", () => {
    expect(matchImageCandidate(normalize(), { ...context(), reviewedCaptionDate: "2006-10-07" }).moments[1]).toMatchObject({ status: "conflict", signalIds: [] });
  });
  it("does not associate an image with another athlete's Moment", () => {
    const c = context(); c.moments[1].athleteId = eventId;
    expect(matchImageCandidate(normalize(), c).moments[1].status).toBe("unmatched");
  });
});
