import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import LockerView from "@/app/player/[slug]/LockerView";
import { previewContent } from "@/lib/preview-lockers/validation";
import { previewLockerData } from "@/lib/preview-lockers/mapper";
import { mergeSuggestions } from "@/lib/preview-lockers/merge-suggestions";
import { enrichPreviewSchoolBranding } from "@/lib/preview-lockers/school-branding";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("@/lib/analytics/client", () => ({ trackProductEvent: vi.fn() }));
const content = previewContent.parse({slug:"fixture-player",full_name:"Fixture Player",schools:[{label:"City College (SF)",color:"#152238"},{label:"CAL",color:"#003262"}]});
const record={...content,id:"00000000-0000-4000-8000-000000000001",revision:1,created_at:"",updated_at:""};
let host:HTMLDivElement,root:Root,fetcher:ReturnType<typeof vi.fn>;
beforeEach(()=>{
 host=document.createElement("div");document.body.append(host);root=createRoot(host);fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
 vi.stubGlobal("IntersectionObserver",class{observe(){} unobserve(){} disconnect(){}});vi.stubGlobal("ResizeObserver",class{observe(){} disconnect(){}});
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
async function fill(label:string,value:string){const input=host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}));});}
async function save(revision:number){fetcher.mockResolvedValueOnce(Response.json({id:record.id,slug:record.slug,revision}));await act(async()=>[...host.querySelectorAll("button")].find(b=>b.textContent==="Save draft")!.click());return JSON.parse(fetcher.mock.calls.at(-1)![1].body).content;}
it("saves, reloads and clears independent School History display names without changing matching labels",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record}/>));
 await fill("School 1 desktop display name","City College of San Francisco");await fill("School 1 mobile display name","CCSF");
 const saved=await save(2);
 expect(saved.schools[0]).toMatchObject({label:"City College (SF)",desktopName:"City College of San Francisco",mobileName:"CCSF"});
 expect(saved.schools[1]).toEqual(content.schools[1]);
 await act(async()=>root.render(<PreviewLockerForm key="reload" record={{...record,...saved,revision:2}}/>));
 expect(host.querySelector<HTMLInputElement>('[aria-label="School 1 mobile display name"]')!.value).toBe("CCSF");
 await fill("School 1 desktop display name","");await fill("School 1 mobile display name","");
 expect((await save(3)).schools[0]).toMatchObject({label:"City College (SF)",desktopName:null,mobileName:null});
});
it("preserves names through repeat scrapes and directory branding, including a school absent from the directory",async()=>{
 const saved=previewContent.parse({...content,schools:content.schools.map(team=>({...team,desktopName:`Custom ${team.label}`,mobileName:"MY SCHOOL"}))});
 const merged=mergeSuggestions(saved,content);
 expect(merged.schools).toEqual(saved.schools);
 const client={from:()=>({select:()=>({limit:async()=>({data:[{display_name:"California Golden Bears",abbreviation:"CAL",primary_color:"#003262",logo_url:null,logo_dark_url:null}],error:null})})})} as unknown as SupabaseClient;
 const data=previewLockerData({...record,...merged,...await enrichPreviewSchoolBranding(client,merged)});
 expect(data.schools.map(team=>[team.desktopName,team.mobileName])).toEqual(saved.schools.map(team=>[team.desktopName,team.mobileName]));
 expect(saved.schools.map(team=>team.label)).toEqual(["City College (SF)","CAL"]);
});
it.each([{desktopName:"City College of San Francisco",mobileName:"CCSF"},{desktopName:null,mobileName:"CCSF"},{desktopName:"City College of San Francisco",mobileName:null}])("renders independent overrides in hero and Team History (%j)",async overrides=>{
 const data=previewLockerData({...record,schools:[{...content.schools[0],...overrides}]});
 await act(async()=>root.render(<LockerView data={data}/>));
 const mobile=overrides.mobileName || data.schools[0].label;
 const desktop=overrides.desktopName || "City College (SF)";
 expect(host.querySelector('.team-history-abbreviation')?.textContent).toBe(mobile);
 expect(host.querySelector('.team-history-full-name')?.textContent).toBe(desktop);
 await act(async()=>host.querySelector<HTMLButtonElement>('[role="tab"][id$="trigger-stats"]')!.dispatchEvent(new MouseEvent("mousedown",{button:0,bubbles:true})));
 const history=host.querySelector('.team-history-sequence')!;
 expect(history.querySelector('.team-history-abbreviation')?.textContent).toBe(mobile);
 expect(history.querySelector('.team-history-full-name')?.textContent).toBe(desktop);
});
it("validates limits and treats whitespace as an automatic-format fallback",()=>{
 for(const override of [{desktopName:"x".repeat(81)},{mobileName:"x".repeat(41)},{desktopName:12},{mobileName:"bad\u0001name"}])expect(previewContent.safeParse({...content,schools:[{...content.schools[0],...override}]}).success).toBe(false);
 expect(previewContent.parse({...content,schools:[{...content.schools[0],desktopName:"   ",mobileName:" CCSF "}]}).schools[0]).toMatchObject({desktopName:"",mobileName:"CCSF"});
});
