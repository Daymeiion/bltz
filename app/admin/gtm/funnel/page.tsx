import { GtmNavigation } from "@/components/admin/gtm/GtmNavigation";
import { previewAdmin } from "@/lib/preview-lockers/server";
import { attributionCode, funnelMetrics } from "@/lib/preview-lockers/conversion";
import { FunnelWorkspace } from "./FunnelWorkspace";
import { collectActivityPages, type Activity, type Response, type PreviewRow } from "@/lib/preview-lockers/funnel-workspace";
export const dynamic="force-dynamic";
export default async function Funnel({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const {client}=await previewAdmin(); const query=await searchParams;
  let cohort=client.from("preview_conversion_campaigns").select("*").eq("is_test",false).order("created_at",{ascending:false}).limit(1000);
  for(const key of ["campaign","channel","source"]){if(query[key]&&attributionCode.safeParse(query[key]).success)cohort=cohort.eq(key,query[key]);}
  for(const [key,op] of [["since","gte"],["until","lte"]] as const){if(query[key]&&/^\d{4}-\d{2}-\d{2}$/.test(query[key]!))cohort=cohort[op]("created_at",`${query[key]}T${key==="since"?"00:00:00":"23:59:59.999"}Z`);}
  const [campaigns,previews,contacts,referrals]=await Promise.all([cohort,client.from("preview_lockers").select("id,full_name,slug").limit(1000),client.from("gtm_contacts").select("id,display_name,email,player_master_gsis_id").eq("archived",false).limit(1000),client.from("preview_conversion_referrals").select("*").order("created_at",{ascending:false}).limit(1000)]);
  if([campaigns,previews,contacts,referrals].some(r=>r.error))throw new Error("Preview funnel data unavailable");
  const rows=campaigns.data??[]; const ids=rows.map(r=>r.preview_id);
  // Load events in pages so 100 active previews do not lose totals at 1,000 events.
  const activity: Activity[] = []; const replies: Response[] = [];
  let truncated=rows.length>=1000;
  for(let start=0;start<ids.length;start+=100){
    const chunk=ids.slice(start,start+100);
    const responseResult=await client.from("preview_conversion_responses").select("*").in("preview_id",chunk);
    if(responseResult.error)throw new Error("Conversion responses unavailable");
    replies.push(...(responseResult.data??[]));
    const collected=await collectActivityPages<Activity>(async offset=>{
      const result=await client.from("preview_conversion_events").select("*").in("preview_id",chunk).order("created_at",{ascending:false}).order("id").range(offset,offset+999);
      if(result.error)throw new Error("Conversion activity unavailable");
      return result.data??[];
    },20000-activity.length);
    activity.push(...collected.rows);
    if(collected.limited)truncated=true;
    if(activity.length>=20000)break;
  }
  activity.sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id));
  const metrics=funnelMetrics(rows,activity);
  const contactOptions=(contacts.data??[]).map(c=>({id:c.id,label:c.display_name||c.player_master_gsis_id||c.id}));
  const lookup=(id:string)=>(previews.data??[]).find(p=>p.id===id);
  const display=(id:string)=>lookup(id)?.full_name||id;
  const filteredReferrals=(referrals.data??[]).filter(r=>ids.includes(r.referrer_preview_id));
  const workspaceRows: PreviewRow[]=rows.map(c=>({...c,name:display(c.preview_id),slug:lookup(c.preview_id)?.slug??null,response:replies.find(r=>r.preview_id===c.preview_id)??null,activity:activity.filter(e=>e.preview_id===c.preview_id)}));
  return <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-8">
    <header className="flex flex-wrap items-end justify-between gap-5 border-b border-neutral-200 pb-6 dark:border-slate-800"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">90-day conversion experiment</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Preview conversion</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Follow athlete interest, plan the next conversation, and grow the referral network.</p></div><GtmNavigation/></header>
    <FunnelWorkspace rows={workspaceRows} referrals={filteredReferrals} metrics={metrics} truncated={truncated} contacts={contactOptions} previews={(previews.data??[]).map(p=>({id:p.id,label:p.full_name}))} query={query} listsTruncated={[previews,contacts,referrals].some(r=>(r.data?.length??0)>=1000)}/>
    <p className="text-xs leading-5 text-neutral-500">Private experiment · An authorized visible-page visit counts as viewed, never an email open. Admin and test activity is excluded. Athlete interest does not verify Locker ownership.</p>
  </main>;
}
