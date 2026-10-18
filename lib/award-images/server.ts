import "server-only";
import sharp from "sharp";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { json, PreviewError } from "@/lib/preview-lockers/server";
import { previewUrl } from "@/lib/preview-lockers/validation";
import { AWARD_IMAGE_BUCKET, IMAGE_LIMIT, awardArtwork, imageType, type AwardImage, type AwardImageChoice, type AwardImageLibrary } from "./model";
import { normalizeAward, type CatalogAward } from "@/lib/enrichment/awards";

export async function signedImages(client:SupabaseClient, rows:AwardImage[]) {
 const paths=rows.flatMap(row=>row.storage_path?[row.storage_path]:[]);
 const result=paths.length?await client.storage.from(AWARD_IMAGE_BUCKET).createSignedUrls(paths,900):null;
 const urls=new Map((result?.data??[]).map(item=>[item.path,item.signedUrl]));
 return rows.map(row=>({...row,imageUrl:row.storage_path?urls.get(row.storage_path)??null:row.external_url}));
}
export async function adminAwardLibrary(client:SupabaseClient):Promise<AwardImageLibrary> {
 async function allRows(table:string,order:string) {
  const rows=[];
  for(let offset=0;;offset+=500){const result=await client.from(table).select("*").order(order).order("id").range(offset,offset+499);if(result.error)throw new PreviewError("award_library_unavailable",503);rows.push(...result.data??[]);if((result.data?.length??0)<500)return rows;}
 }
 const [images,catalog]=await Promise.all([allRows("award_image_assets","created_at"),allRows("award_catalog","name")]);
 return {images:await signedImages(client,images),catalog};
}
/** Called only after the existing Locker/preview visibility gate. */
export async function publicAwardArtwork<T extends AwardImageChoice>(awards:T[], fallback:CatalogAward[]=[]):Promise<T[]> {
 try {
  const client=createServiceClient();
  const catalogResult=await client.from("award_catalog").select("*").eq("active",true).limit(500);
  const catalog=catalogResult.error?fallback:catalogResult.data??fallback;
  const matches=new Set(awards.map(award=>normalizeAward(award,catalog).award_id));
  const ids=[...new Set([...awards.flatMap(a=>a.imageAssetId?[a.imageAssetId]:[]),...catalog.filter(row=>matches.has(row.id)).flatMap(a=>a.image_asset_id?[a.image_asset_id]:[])])];
  const images=ids.length?await client.from("award_image_assets").select("*").in("id",ids).eq("active",true).eq("asset_status","approved"):null;
  const library={catalog,images:await signedImages(client,images?.data??[])} as AwardImageLibrary;
  return awards.map(award=>{const {catalog:match,...art}=awardArtwork(award,library);return {...award,...art,...(match?{label:match.name}:{} )};});
 } catch {
  return awards.map(award=>{const {catalog,...art}=awardArtwork(award,{catalog:fallback as AwardImageLibrary["catalog"],images:[]});return {...award,...art,...(catalog?{label:catalog.name}:{})};});
 }
}
export async function assertAwardReferences(client:SupabaseClient, awards:AwardImageChoice[]) {
 for(const [field,table] of [["imageAssetId","award_image_assets"],["catalogAwardId","award_catalog"]] as const) {
  const ids=[...new Set(awards.flatMap(row=>row[field]?[row[field]!]:[]))];
  if(!ids.length) continue;
  const result=await client.from(table).select("id").in("id",ids);
  if(result.error || result.data?.length!==ids.length) throw new PreviewError("invalid_award_reference",400);
 }
}
export async function storeAwardBytes(client:SupabaseClient, bytes:Uint8Array, title:string, extra:Record<string,unknown>={}) {
 const type=imageType(bytes);
 if(!type || !bytes.length || bytes.length>IMAGE_LIMIT) throw new PreviewError("invalid_award_image",400);
 try {const metadata=await sharp(bytes,{limitInputPixels:40000000}).metadata();if(!metadata.width || !metadata.height || !["png","jpeg","webp"].includes(metadata.format))throw new Error();}
 catch {throw new PreviewError("invalid_award_image",400);}
 const hash=createHash("sha256").update(bytes).digest("hex");
 const existing=await client.from("award_image_assets").select("id,original_filename,storage_path").eq("sha256",hash).maybeSingle();
 if(existing.error) throw new PreviewError("award_library_unavailable",503);
 const path=`images/${hash}.${type.ext}`;
 const upload=await client.storage.from(AWARD_IMAGE_BUCKET).upload(path,bytes,{contentType:type.mime,upsert:false});
 if(upload.error && !/already exists|duplicate/i.test(upload.error.message)) throw new PreviewError("award_upload_failed",503);
 if(existing.data) {await rememberAwardFilename(client,existing.data.id,typeof extra.original_filename==="string"?extra.original_filename:undefined);return json({id:existing.data.id,duplicate:true});}
 const inserted=await client.from("award_image_assets").insert({...extra,title,storage_path:path,sha256:hash,mime_type:type.mime,byte_size:bytes.length}).select("id").single();
 if(inserted.error?.code==="23505") {const saved=await client.from("award_image_assets").select("id").eq("sha256",hash).maybeSingle();if(saved.data)return json({id:saved.data.id,duplicate:true});}
 if(inserted.error) throw new PreviewError("award_image_not_saved",503);
 return json({id:inserted.data.id},201);
}
export function safeReference(value:unknown) {return previewUrl.safeParse(value).data??null;}
/** Preserve the first known upload filename without changing image identity. */
export async function rememberAwardFilename(client:SupabaseClient,id:string,filename?:string) {
 if(!filename)return;
 const result=await client.from("award_image_assets").update({original_filename:filename}).eq("id",id).is("original_filename",null);
 if(result.error)throw new PreviewError("award_filename_not_saved",503);
}
