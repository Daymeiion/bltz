import { previewAdmin } from "@/lib/preview-lockers/server";
import PreviewLockerForm from "../PreviewLockerForm";
import { notFound } from "next/navigation";
import { z } from "zod";
export const dynamic = "force-dynamic";
export default async function NewPreview({searchParams}:{searchParams:Promise<{intake?:string}>}) {
  const {client}=await previewAdmin();
  const {intake}=await searchParams;
  let reservedId: string | undefined; let referralName: string | undefined;
  if(intake){
    if(!z.uuid().safeParse(intake).success)notFound();
    const {data,error}=await client.from("preview_conversion_referrals").select("reserved_preview_id,preview_id,full_name,contact_id").eq("id",intake).maybeSingle();
    if(error)throw new Error("Referral intake unavailable");
    if(!data||data.preview_id||!data.contact_id)notFound();
    reservedId=data.reserved_preview_id;referralName=data.full_name;
  }
  const enrollmentEnabled = process.env.PREVIEW_CONVERSION_ENABLED === "true" && !reservedId;
  const contacts: {id:string;label:string}[]=[];
  if(enrollmentEnabled){
    for(let offset=0;;offset+=1000){
      const result=await client.from("gtm_contacts").select("id,display_name").eq("archived",false).order("display_name").order("id").range(offset,offset+999);
      if(result.error)throw new Error("GTM contacts unavailable");
      contacts.push(...(result.data??[]).map(c=>({id:c.id,label:c.display_name})));
      if((result.data?.length??0)<1000)break;
    }
  }
  return <section className="mx-auto max-w-4xl space-y-6 p-6 sm:p-10"><h1 className="text-3xl font-semibold">Create private preview</h1>{reservedId&&<p>This save consumes the referral’s reserved preview ID and links its GTM contact. Viewer access must be assigned separately.</p>}<PreviewLockerForm reservedId={reservedId} referralName={referralName} enrollmentEnabled={enrollmentEnabled} enrollmentContacts={contacts}/></section>;
}
