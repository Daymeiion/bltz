"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { previewAdmin } from "@/lib/preview-lockers/server";
import { attributionCode, outreachChannels } from "@/lib/preview-lockers/conversion";

export async function conversionAdminAction(_previous: {message:string;error?:boolean}, form: FormData): Promise<{message:string;error?:boolean}> {
  try {
    const {client}=await previewAdmin();
    const action=z.enum(["enroll","sent","booking_confirmed","walkthrough_completed","resolve_referral","review_inquiry_email"]).parse(form.get("action"));
    const preview=z.uuid().parse(form.get("preview"));
    if(action === "review_inquiry_email") {
      if(form.get("reviewed") !== "on") return {message:"Review this submission and its contact match before copying email.",error:true};
      const {error}=await client.rpc("accept_preview_inquiry_email",{
        p_inquiry:z.uuid().parse(form.get("inquiry")),p_contact:z.uuid().parse(form.get("contact")),
        p_reason:z.string().trim().min(10).max(500).parse(form.get("reason")),
      });
      if(error)return {message:"Email could not be copied. Check the enrolled contact, review status and existing email. An existing contact email cannot be replaced.",error:true};
      revalidatePath("/admin/gtm/funnel"); revalidatePath("/admin/gtm/contacts"); revalidatePath(`/admin/preview-lockers/${preview}/link`);
      return {message:"Reviewed email copied and audited. Identity and Locker ownership remain unverified. No email was sent."};
    }
    let data: Record<string,unknown>={};
    if(action === "enroll") data={contact_id:z.uuid().parse(form.get("contact")),campaign:attributionCode.parse(form.get("campaign")),source:attributionCode.parse(form.get("source")),channel:z.enum(outreachChannels).parse(form.get("channel")),relationship:z.enum(["warm","cold"]).parse(form.get("relationship")),is_test:form.get("is_test")==="on"};
    if(action === "sent") {
      const sentAt=z.iso.datetime().parse(form.get("sent_at"));
      if(Date.parse(sentAt)>Date.now())return {message:"The time sent must be in the past. Check your selected local time.",error:true};
      data={channel:z.enum(outreachChannels).parse(form.get("channel")),sent_at:sentAt};
    }
    if(action === "resolve_referral") data={contact_id:z.uuid().parse(form.get("contact")),referral_id:z.uuid().parse(form.get("referral"))};
    const id=crypto.randomUUID();
    const {error}=await client.rpc("preview_conversion",{p_preview:preview,p_action:action,p_request:id,p_session:id,p_data:data});
    if(error)return {message:error.code==="22023"?"Could not save: check the contact association, reviewed published link or eligible viewer grant, sent channel/time, and existing response. Enrollment attribution and the first sent record cannot be overwritten.":"Could not confirm a save. Keep the same details when retrying, or reload the current status.",error:true};
    revalidatePath("/admin/gtm/funnel");
    return {message:action==="sent"?"Manual sent channel and time recorded. No message or email was sent.":"Saved."};
  } catch (error) {
    return {message:error instanceof z.ZodError ? "Could not save. Check the required fields and your Admin access."
      : "Could not confirm a save. Check the current status and your Admin access before retrying with the same details.",error:true};
  }
}
