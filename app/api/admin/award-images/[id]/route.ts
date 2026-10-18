import { z } from "zod";
import { previewAdmin, readBody, json, failure, PreviewError } from "@/lib/preview-lockers/server";
import { imageDetails } from "@/lib/award-images/model";
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}) {
 try {
  const {client}=await previewAdmin();const {id}=await params;
  const parsed=z.object({revision:z.number().int().positive(),details:imageDetails}).strict().safeParse(await readBody(req,8192));
  if(!z.uuid().safeParse(id).success || !parsed.success)throw new PreviewError("invalid_input",400);
  const result=await client.from("award_image_assets").update(parsed.data.details).eq("id",id).eq("revision",parsed.data.revision).select("id").maybeSingle();
  if(result.error)throw new PreviewError("award_image_not_saved",503);if(!result.data)throw new PreviewError("award_image_changed",409);
  return json({id});
 }catch(error){return failure(error);}
}
