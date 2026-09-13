"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { previewAdmin } from "@/lib/preview-lockers/server";
import { attributionCode } from "@/lib/preview-lockers/conversion";

export async function conversionAdminAction(_previous: {message:string}, form: FormData) {
  try {
    const {client}=await previewAdmin();
    const action=z.enum(["enroll","sent","booking_confirmed","walkthrough_completed","resolve_referral"]).parse(form.get("action"));
    const preview=z.uuid().parse(form.get("preview"));
    let data: Record<string,unknown>={};
    if(action === "enroll") data={contact_id:z.uuid().parse(form.get("contact")),campaign:attributionCode.parse(form.get("campaign")),source:attributionCode.parse(form.get("source")),channel:z.enum(["email","linkedin","sms","in_person","referral","other"]).parse(form.get("channel")),relationship:z.enum(["warm","cold"]).parse(form.get("relationship")),is_test:form.get("is_test")==="on"};
    if(action === "resolve_referral") data={contact_id:z.uuid().parse(form.get("contact")),referral_id:z.uuid().parse(form.get("referral"))};
    const id=crypto.randomUUID();
    const {error}=await client.rpc("preview_conversion",{p_preview:preview,p_action:action,p_request:id,p_session:id,p_data:data});
    if(error)return {message:error.code==="22023"?"Could not save: check the contact association, viewer assignment and existing response. Enrollment attribution cannot be overwritten.":"Could not save. No success was recorded; please retry."};
    revalidatePath("/admin/gtm/funnel");
    return {message:"Saved."};
  } catch {return {message:"Could not save. Check the required fields and your Admin access."};}
}
