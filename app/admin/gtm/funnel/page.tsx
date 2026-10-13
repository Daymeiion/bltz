import { GtmNavigation } from "@/components/admin/gtm/GtmNavigation";
import { previewAdmin } from "@/lib/preview-lockers/server";
import { attributionCode, funnelMetrics } from "@/lib/preview-lockers/conversion";
import { FunnelWorkspace } from "./FunnelWorkspace";
import { PreviewActivityPanel } from "./PreviewActivityPanel";
import { PreviewInvitationEmailPanel } from "./PreviewInvitationEmailPanel";
import { loadInvitationEmailReport } from "@/lib/preview-lockers/invitation-email-report";
import { loadPreviewFunnelReport } from "@/lib/analytics/preview-funnel";
import { collectActivityPages, type Activity, type Response, type PreviewRow, type PublicInquiry } from "@/lib/preview-lockers/funnel-workspace";
export const dynamic="force-dynamic";
export default async function Funnel({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {client}=await previewAdmin();
  const supplied=await searchParams;
  const query:Record<string,string|undefined>=Object.fromEntries(Object.entries(supplied).map(([key,value])=>[key,typeof value === "string" ? value : undefined]));
  const previewActivity=await loadPreviewFunnelReport({previewId:query.activity_preview});
  const emailPreviewId=previewActivity.selectionStatus === "ready" ? previewActivity.selectedPreview?.id : null;
  const invitationEmailPromise=loadInvitationEmailReport({previewId:emailPreviewId});
  const recipientAssociationPromise=emailPreviewId ? Promise.all([
    client.from("preview_conversion_campaigns").select("contact_id").eq("preview_id",emailPreviewId).maybeSingle(),
    client.from("gtm_player_preview_lockers").select("gsis_id").eq("preview_locker_id",emailPreviewId).maybeSingle(),
  ]) : null;
  let cohort=client.from("preview_conversion_campaigns").select("*").eq("is_test",false).order("created_at",{ascending:false}).limit(1000);
  for(const key of ["campaign","channel","source"]){if(query[key]&&attributionCode.safeParse(query[key]).success)cohort=cohort.eq(key,query[key]);}
  for(const [key,op] of [["since","gte"],["until","lte"]] as const){if(query[key]&&/^\d{4}-\d{2}-\d{2}$/.test(query[key]!))cohort=cohort[op]("created_at",`${query[key]}T${key==="since"?"00:00:00":"23:59:59.999"}Z`);}
  const [campaigns,previews,contacts,referrals]=await Promise.all([cohort,client.from("preview_lockers").select("id,full_name,slug").limit(1000),client.from("gtm_contacts").select("id,display_name,email,player_master_gsis_id").eq("archived",false).limit(1000),client.from("preview_conversion_referrals").select("*").order("created_at",{ascending:false}).limit(1000)]);
  if([campaigns,previews,contacts,referrals].some(r=>r.error))throw new Error("Preview funnel data unavailable");
  const invitationEmail=await invitationEmailPromise;
  const recipientAssociation=recipientAssociationPromise ? await recipientAssociationPromise : null;
  const emailContacts=recipientAssociation?.some(result=>result.error) ? [] : (contacts.data??[]).filter(contact=>Boolean(contact.email)
    && (!recipientAssociation?.[0].data?.contact_id || contact.id===recipientAssociation[0].data.contact_id)
    && (!recipientAssociation?.[1].data?.gsis_id || contact.player_master_gsis_id===recipientAssociation[1].data.gsis_id)
  ).map(contact=>({id:contact.id,label:contact.display_name||contact.player_master_gsis_id||contact.id,email:contact.email!}));
  const rows=campaigns.data??[]; const ids=rows.map(r=>r.preview_id);
  // Load events in pages so 100 active previews do not lose totals at 1,000 events.
  const activity: Activity[] = []; const replies: Response[] = []; const inquiries: PublicInquiry[] = [];
  let truncated=rows.length>=1000;
  for(let start=0;start<ids.length;start+=100){
    const chunk=ids.slice(start,start+100);
    const [responseResult, inquiryResult]=await Promise.all([
      client.from("preview_conversion_responses").select("*").in("preview_id",chunk),
      collectActivityPages<PublicInquiry>(async offset=>{
        const result=await client.from("preview_link_inquiries").select("id,preview_id,email,feature_requests,created_at,reviewed_at,reviewed_contact_id")
          .in("preview_id",chunk).order("created_at",{ascending:false}).order("id").range(offset,offset+999);
        if(result.error)throw new Error("Public preview inquiries unavailable");
        return result.data??[];
      },10000-inquiries.length),
    ]);
    if(responseResult.error)throw new Error("Conversion responses unavailable");
    replies.push(...(responseResult.data??[]));
    inquiries.push(...inquiryResult.rows);
    if(inquiryResult.limited)truncated=true;
    const collected=await collectActivityPages<Activity>(async offset=>{
      const result=await client.from("preview_conversion_events").select("*").in("preview_id",chunk).order("created_at",{ascending:false}).order("id").range(offset,offset+999);
      if(result.error)throw new Error("Conversion activity unavailable");
      return result.data??[];
    },20000-activity.length);
    activity.push(...collected.rows);
    if(collected.limited)truncated=true;
    if(activity.length>=20000 || inquiries.length>=10000)break;
  }
  activity.sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id));
  const metrics=funnelMetrics(rows,activity);
  const contactOptions=(contacts.data??[]).map(c=>({id:c.id,label:c.display_name||c.player_master_gsis_id||c.id}));
  const lookup=(id:string)=>(previews.data??[]).find(p=>p.id===id);
  const display=(id:string)=>lookup(id)?.full_name||id;
  const filteredReferrals=(referrals.data??[]).filter(r=>ids.includes(r.referrer_preview_id));
  const newestInquiry=new Map<string,PublicInquiry>();
  for(const inquiry of inquiries){if(!newestInquiry.has(inquiry.preview_id))newestInquiry.set(inquiry.preview_id,inquiry);}
  const workspaceRows: PreviewRow[]=rows.map(c=>{
    const inquiry=newestInquiry.get(c.preview_id)??null;
    const contact=(contacts.data??[]).find(row=>row.id===c.contact_id);
    return {...c,name:display(c.preview_id),slug:lookup(c.preview_id)?.slug??null,response:replies.find(r=>r.preview_id===c.preview_id)??null,
      activity:activity.filter(e=>e.preview_id===c.preview_id),inquiry,contactEmail:contact?.email??null,
      canReviewInquiryEmail:Boolean(contact && !contact.email && inquiry && !inquiry.reviewed_at)};
  });
  return <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-8">
    <header className="flex flex-wrap items-end justify-between gap-5 border-b border-neutral-200 pb-6 dark:border-slate-800"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">90-day conversion experiment</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Preview conversion</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Follow athlete interest, plan the next conversation, and grow the referral network.</p></div><GtmNavigation/></header>
    <PreviewActivityPanel report={previewActivity} query={query}/>
    <PreviewInvitationEmailPanel report={invitationEmail} previewName={previewActivity.selectedPreview?.label ?? null} privateInvitation={previewActivity.selectedPreview?.access === "private"} contacts={emailContacts}/>
    <FunnelWorkspace rows={workspaceRows} referrals={filteredReferrals} metrics={metrics} truncated={truncated} contacts={contactOptions} previews={(previews.data??[]).map(p=>({id:p.id,label:p.full_name}))} query={query} listsTruncated={[previews,contacts,referrals].some(r=>(r.data?.length??0)>=1000)}/>
    <p className="text-xs leading-5 text-neutral-500">Private experiment · An authorized visible-page visit counts as viewed, never an email open. Admin and test activity is excluded. Athlete interest does not verify Locker ownership.</p>
  </main>;
}
