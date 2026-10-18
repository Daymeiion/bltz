import { z } from "zod";
import { previewAdmin,readBody,json,failure,PreviewError,PREVIEW_MEDIA_BUCKETS } from "@/lib/preview-lockers/server";
import { safeReference,storeAwardBytes } from "@/lib/award-images/server";
import { IMAGE_LIMIT } from "@/lib/award-images/model";
export async function GET() {
 try {
  const {client}=await previewAdmin();const result=await client.from("preview_lockers").select("id,full_name,photos").limit(200);
  if(result.error)throw new PreviewError("award_imports_unavailable",503);
  const candidates=(result.data??[]).flatMap(row=>(row.photos as Array<{id:string;title:string}>??[]).filter(photo=>/award|troph|thorpe|all.?american|heisman|lott|champion/i.test(photo.title)).map(photo=>({previewId:row.id,photoId:photo.id,title:photo.title,player:row.full_name})));
  return json({candidates});
 }catch(error){return failure(error);}
}
export async function POST(req:Request) {
 try {
  const {client}=await previewAdmin();const parsed=z.object({previewId:z.uuid(),photoId:z.string().min(1).max(80)}).strict().safeParse(await readBody(req,2048));
  if(!parsed.success)throw new PreviewError("invalid_input",400);
  const result=await client.from("preview_lockers").select("photos,slug").eq("id",parsed.data.previewId).maybeSingle();
  const photos=result.data?.photos as Array<{id:string;title:string;storagePath?:string;url?:string;sourceUrl?:string;credits?:string}>|undefined;
  const photo=photos?.find(row=>row.id===parsed.data.photoId);if(result.error || !photo)throw new PreviewError("award_source_not_found",404);
  const source=safeReference(photo.sourceUrl)??`${new URL(req.url).origin}/preview-lockers/${encodeURIComponent(result.data!.slug)}`;
  const metadata={image_source_url:source,attribution:photo.credits?.slice(0,500)||null};
  if(photo.storagePath) {
   if(!photo.storagePath.startsWith(`${parsed.data.previewId}/photos/`))throw new PreviewError("invalid_input",400);
   const file=await client.storage.from(PREVIEW_MEDIA_BUCKETS.photo).download(photo.storagePath);
   if(file.error || !file.data || file.data.size>IMAGE_LIMIT)throw new PreviewError("award_source_unavailable",503);
   return await storeAwardBytes(client,new Uint8Array(await file.data.arrayBuffer()),photo.title,metadata);
  }
  const url=safeReference(photo.url);if(!url)throw new PreviewError("invalid_input",400);
  const existing=await client.from("award_image_assets").select("id").eq("external_url",url).maybeSingle();if(existing.data)return json({id:existing.data.id,duplicate:true});
  const inserted=await client.from("award_image_assets").insert({title:photo.title,external_url:url,...metadata}).select("id").single();
  if(inserted.error)throw new PreviewError("award_image_not_saved",503);return json({id:inserted.data.id},201);
 }catch(error){return failure(error);}
}
