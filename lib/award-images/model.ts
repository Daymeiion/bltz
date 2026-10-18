import { z } from "zod";
import type { AwardImageDatabase } from "@/types/award-images.generated";
import { previewUrl } from "@/lib/preview-lockers/validation";
import type { CatalogAward } from "@/lib/enrichment/awards";
import { catalogImage, normalizeAward, type AwardEvidence } from "@/lib/enrichment/awards";
import { resolveMediaPermissions } from "@/lib/enrichment/permissions";

export const AWARD_IMAGE_BUCKET = "award-library";
export const IMAGE_LIMIT = 10 * 1024 * 1024;
const text = (max: number) => z.string().trim().max(max).regex(/^[^\u0000-\u001f\u007f]*$/);
export const imageDetails = z.object({ title:text(160).min(1),image_source_url:previewUrl.nullable(),image_license:text(500).nullable(),attribution:text(500).nullable(),asset_status:z.enum(["placeholder","approved"]),active:z.boolean() }).strict().refine(value=>value.asset_status!=="approved" || !!(value.image_source_url && value.image_license?.trim() && value.attribution?.trim()),"Approved images need a source, usage permission and credit.");
export type AwardImage = z.infer<typeof imageDetails> & Pick<AwardImageDatabase["public"]["Tables"]["award_image_assets"]["Row"],"id"|"storage_path"|"external_url"|"sha256"|"mime_type"|"byte_size"|"revision"> & {imageUrl:string|null};
export type AwardImageLibrary = {images:AwardImage[];catalog:Array<CatalogAward & {image_asset_id?:string|null;updated_at:string;imageUrl?:string|null}>};
export const catalogDetails = z.object({name:text(200).min(1),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),sport:text(40).min(1),level:z.enum(["hs","college","pro"]).nullable(),award_type:z.enum(["selection","individual","championship"]),aliases:z.array(text(200).min(1)).max(40),image_asset_id:z.uuid().nullable()}).strict();
export const BUNDLED_AWARD_IMAGES = [
 {title:"BLTZ All-American",path:"/images/Awards/Award-AllAmericanIcon.png"},
 {title:"BLTZ Conference",path:"/images/Awards/Award-ConferenceIcon.png"},
 {title:"BLTZ Retired Jersey",path:"/images/Awards/Award-JerseyIcon.png"},
 {title:"BLTZ Championship Ring",path:"/images/Awards/Award-RingIcon.png"},
 {title:"BLTZ Award Star",path:"/images/Awards/Award-StarIcon.png"},
];
export type AwardImageChoice = AwardEvidence & {imageMode?:"auto"|"custom"|"none";imageAssetId?:string|null;photoId?:string|null;imageUrl?:string|null;attribution?:string|null};
export function awardArtwork(input:AwardImageChoice, library:Pick<AwardImageLibrary,"images"|"catalog">) {
 const matched=normalizeAward(input,library.catalog);
 const catalog=library.catalog.find(row=>row.id===matched.award_id);
 const mode=input.imageMode ?? (input.imageAssetId || input.photoId || input.imageUrl ? "custom" : "auto");
 if(mode==="none") return {imageUrl:null,photoId:null,attribution:null,catalog};
 if(mode==="custom" && !input.imageAssetId) return {imageUrl:input.imageUrl??null,photoId:input.photoId??null,attribution:input.attribution??null,catalog};
 const assetId=mode==="custom" ? input.imageAssetId : catalog?.image_asset_id;
 if(assetId) {
  const image=library.images.find(row=>row.id===assetId);
  const imageUrl=image ? resolveMediaPermissions({...image,canonical_image_url:image.imageUrl},"preview_award").imageUrl : null;
  return {imageUrl,photoId:null,attribution:imageUrl?image?.attribution??null:null,catalog};
 }
 return {imageUrl:catalog?catalogImage(catalog):null,photoId:null,attribution:catalog?.attribution??null,catalog};
}
export function imageType(bytes:Uint8Array):{mime:string;ext:string}|null {
 if(bytes.length>=8 && [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)) return {mime:"image/png",ext:"png"};
 if(bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return {mime:"image/jpeg",ext:"jpg"};
 if(bytes.length>=12 && new TextDecoder().decode(bytes.slice(0,4))==="RIFF" && new TextDecoder().decode(bytes.slice(8,12))==="WEBP") return {mime:"image/webp",ext:"webp"};
 return null;
}
