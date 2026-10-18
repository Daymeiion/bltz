import { previewAdmin,readBody,json,failure,PreviewError } from "@/lib/preview-lockers/server";
import { catalogDetails } from "@/lib/award-images/model";
export async function POST(req:Request) {
 try {
  const {client}=await previewAdmin();const parsed=catalogDetails.safeParse(await readBody(req,16384));
  if(!parsed.success)throw new PreviewError("invalid_input",400);
  const result=await client.from("award_catalog").insert(parsed.data).select("id").single();
  if(result.error)throw new PreviewError(result.error.code==="23505"?"award_already_exists":"award_mapping_not_saved",result.error.code==="23505"?409:503);
  return json({id:result.data.id},201);
 }catch(error){return failure(error);}
}
