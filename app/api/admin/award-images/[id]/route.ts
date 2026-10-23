import { z } from "zod";
import { previewAdmin, readBody, json, failure, PreviewError } from "@/lib/preview-lockers/server";
import { imageDetails } from "@/lib/award-images/model";

const revision = z.number().int().positive();

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}) {
 try {
  const {client}=await previewAdmin();const {id}=await params;
  const parsed=z.union([
   z.object({revision,details:imageDetails}).strict(),
   z.object({revision,active:z.literal(true)}).strict(),
  ]).safeParse(await readBody(req,8192));
  if(!z.uuid().safeParse(id).success || !parsed.success)throw new PreviewError("invalid_input",400);
  const details="details" in parsed.data ? parsed.data.details : {active:true};
  const result=await client.from("award_image_assets").update(details).eq("id",id).eq("revision",parsed.data.revision).select("id,revision,active").maybeSingle();
  if(result.error)throw new PreviewError("award_image_not_saved",503);if(!result.data)throw new PreviewError("award_image_changed",409);
  return json(result.data);
 }catch(error){return failure(error);}
}

/** Preserve image references, stored bytes and audit history when removing artwork. */
export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}) {
 try {
  const {client}=await previewAdmin();const {id}=await params;
  const parsed=z.object({revision}).strict().safeParse(await readBody(req,1024));
  if(!z.uuid().safeParse(id).success || !parsed.success)throw new PreviewError("invalid_input",400);
  const result=await client.from("award_image_assets").update({active:false}).eq("id",id).eq("revision",parsed.data.revision).select("id,revision,active").maybeSingle();
  if(result.error)throw new PreviewError("award_image_not_removed",503);
  if(!result.data)throw new PreviewError("award_image_changed",409);
  return json(result.data);
 }catch(error){return failure(error);}
}
