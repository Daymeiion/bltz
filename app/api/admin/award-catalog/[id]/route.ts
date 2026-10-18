import { z } from "zod";
import { previewAdmin,readBody,json,failure,PreviewError } from "@/lib/preview-lockers/server";
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}) {
 try {
  const {client}=await previewAdmin();const {id}=await params;
  const parsed=z.object({updated_at:z.string().datetime({offset:true}),image_asset_id:z.uuid().nullable(),aliases:z.array(z.string().trim().min(1).max(200).regex(/^[^\u0000-\u001f\u007f]*$/)).max(40)}).strict().safeParse(await readBody(req,16384));
  if(!z.uuid().safeParse(id).success || !parsed.success)throw new PreviewError("invalid_input",400);
  const {updated_at,...values}=parsed.data;
  const result=await client.from("award_catalog").update(values).eq("id",id).eq("updated_at",updated_at).select("id").maybeSingle();
  if(result.error)throw new PreviewError("award_mapping_not_saved",503);if(!result.data)throw new PreviewError("award_mapping_changed",409);
  return json({id});
 }catch(error){return failure(error);}
}
