import { z } from "zod";
import { isSafeSourceLocator } from "../ingestion/contracts";
import type { ImageCandidate, ImagesManifestContext, ImagesNormalizationResult } from "./contracts";

// Official JSON example: root metadata + assetlist array; refs use entity_ids.
// https://developer.sportradar.com/images-and-editorials/reference/images-action-shot-manifest-by-event
const label = z.string().trim().min(1).max(1000);
const scope = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/);
const timestamp = z.iso.datetime({ offset: true }).nullish();
const Entity = z.object({ origin: label, id: label, sport: scope.nullish() });
const Ref = z.object({ name: label.nullish(), type: label, sport: scope.nullish(),
  sportradar_id: label.nullish(), entity_ids: z.array(Entity).optional() });
const Link = z.object({ href: label.refine(isSafeSourceLocator, "unsafe_rendition_locator"),
  width: z.number().int().positive(), height: z.number().int().positive() });
const Asset = z.object({ id: label, title: label, description: z.string().max(30000).nullish(),
  copyright: z.string().max(5000).nullish(), created: timestamp, updated: timestamp,
  links: z.array(Link).optional(), refs: z.array(Ref).optional(),
  provider: z.object({ name: scope, provider_item_id: label.nullish(), original_publish: timestamp }),
});
const Context = z.object({ transportProvider: scope, publisher: scope, sport: scope, league: scope,
  sourceLocator: label.refine(isSafeSourceLocator, "unsafe_source_locator"), fetchedAt: z.iso.datetime({ offset: true }) });
const Manifest = z.object({ provider: scope, league: scope, type: scope, manifest_date: timestamp,
  assetlist: z.array(z.unknown()).max(10000) });

/** Metadata only. Does not fetch images, infer event dates or authorize their use. */
export function normalizeImagesManifest(raw: unknown, input: ImagesManifestContext): ImagesNormalizationResult {
  const context = Context.parse(input);
  const manifest = Manifest.parse(raw);
  if (manifest.provider !== context.publisher || manifest.league !== context.league) throw new Error("manifest_scope_conflict");
  const result: ImagesNormalizationResult = { assets: [], manifestUpdatedAt: manifest.manifest_date ?? null, issues: [] };
  const seen = new Set<string>();
  manifest.assetlist.forEach((rawAsset, assetIndex) => {
    const parsed = Asset.safeParse(rawAsset);
    if (!parsed.success) { result.issues.push({ code: "malformed_asset_metadata", assetIndex }); return; }
    const asset = parsed.data;
    if (asset.provider.name !== manifest.provider) { result.issues.push({ code: "asset_publisher_conflict", assetIndex }); return; }
    if (seen.has(asset.id)) {
      result.assets = result.assets.filter(item => item.externalAssetId !== asset.id);
      result.issues.push({ code: "duplicate_external_asset_id", assetIndex }); return;
    }
    seen.add(asset.id);
    const normalized: ImageCandidate = {
      externalAssetId: asset.id, publisher: asset.provider.name, publisherAssetId: asset.provider.provider_item_id ?? null,
      sport: context.sport, league: context.league, kind: manifest.type,
      title: asset.title, caption: asset.description ?? null, copyright: asset.copyright ?? null,
      createdAt: asset.created ?? null, updatedAt: asset.updated ?? null, originalPublishedAt: asset.provider.original_publish ?? null,
      references: (asset.refs ?? []).map(ref => ({ type: ref.type, name: ref.name ?? null,
        scopeSport: ref.sport ?? null, legacySportradarId: ref.sportradar_id ?? null,
        identities: (ref.entity_ids ?? []).map(entity => ({ origin: entity.origin, sport: entity.sport ?? null, id: entity.id })) })),
      renditions: (asset.links ?? []).map(link => ({ locator: link.href, width: link.width, height: link.height })),
      source: { id: null, name: `${context.transportProvider} ${manifest.provider} ${manifest.league} ${manifest.type} manifest`,
        provider: context.transportProvider, locator: context.sourceLocator, fetchedAt: context.fetchedAt },
      sourcePointer: `/assetlist/${assetIndex}`, rightsStatus: "unknown", reviewStatus: "candidate",
    };
    result.assets.push(normalized);
  });
  return result;
}
