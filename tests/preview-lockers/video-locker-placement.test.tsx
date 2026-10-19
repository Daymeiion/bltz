import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import LockerView from "@/app/player/[slug]/LockerView";
import { previewContent, previewVideo } from "@/lib/preview-lockers/validation";
import { previewLockerData, toLockerData } from "@/lib/preview-lockers/mapper";
import { mergeSuggestions } from "@/lib/preview-lockers/merge-suggestions";
import type { PreviewLockerRow } from "@/lib/preview-lockers/types";
import type { ResolvedPreviewRecord } from "@/lib/preview-lockers/validation";
vi.mock("@/lib/analytics/client", () => ({ trackProductEvent: vi.fn() }));
const external={id:"interview",title:"Career interview",url:"https://www.youtube.com/watch?v=abcdefghijk",thumb:null,level:"off-field" as const};
const stored={id:"upload",title:"Uploaded conversation",storagePath:"00000000-0000-4000-8000-000000000001/videos/00000000-0000-4000-8000-000000000002.mp4",mimeType:"video/mp4" as const,thumb:null};
const content=previewContent.parse({slug:"fixture-player",full_name:"Fixture Player",videos:[external,stored]});
const record={...content,id:"00000000-0000-4000-8000-000000000001",revision:1,created_at:"",updated_at:""};
let host:HTMLDivElement,root:Root,fetcher:ReturnType<typeof vi.fn>;
beforeEach(()=>{host=document.createElement("div");document.body.append(host);root=createRoot(host);fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);vi.stubGlobal("IntersectionObserver",class{observe(){}unobserve(){}disconnect(){}});vi.stubGlobal("ResizeObserver",class{observe(){}disconnect(){}});});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
async function choose(index:number,value:string){const select=host.querySelector<HTMLSelectElement>(`[aria-label="Video ${index} Locker placement"]`)!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value")!.set!.call(select,value);select.dispatchEvent(new Event("change",{bubbles:true}));});}
async function click(text:string){await act(async()=>[...host.querySelectorAll("button")].find(b=>b.textContent===text)!.click());}
async function save(revision:number){fetcher.mockResolvedValueOnce(Response.json({id:record.id,slug:record.slug,revision}));await click("Save draft");return previewContent.parse(JSON.parse(fetcher.mock.calls.at(-1)![1].body).content);}
async function mediaTab(category:"PODCAST"|"SOCIAL"){
 await act(async()=>host.querySelector<HTMLButtonElement>('[role="tab"][id$="trigger-media"]')!.dispatchEvent(new MouseEvent("mousedown",{button:0,bubbles:true})));
 await click(category);
}
it("saves, reloads, changes and clears placement for external and uploaded videos",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record}/>));
 expect([...host.querySelectorAll<HTMLSelectElement>('[aria-label$="Locker placement"]')].map(s=>s.value)).toEqual(["",""]);
 await choose(1,"both");await choose(2,"social");const saved=await save(2);
 expect(saved.videos).toEqual([{...external,lockerPlacement:"both"},{...stored,lockerPlacement:"social"}]);
 await act(async()=>root.render(<PreviewLockerForm key="reload" record={{...record,...saved,revision:2}}/>));
 expect(host.querySelector<HTMLSelectElement>('[aria-label="Video 1 Locker placement"]')!.value).toBe("both");
 expect(host.querySelector<HTMLSelectElement>('[aria-label="Video 2 Locker placement"]')!.value).toBe("social");
 await choose(1,"podcast");await choose(2,"");const edited=await save(3);
 expect(edited.videos).toEqual([{...external,lockerPlacement:"podcast"},stored]);
 await choose(1,"");expect((await save(4)).videos).toEqual([external,stored]);
});
it.each(["podcast","social","both"] as const)("maps and displays %s videos only in the selected tabs with existing detail links",async lockerPlacement=>{
 const data=previewLockerData({...record,videos:[{...external,lockerPlacement}]});
 expect(toLockerData({...record,videos:[{...external,lockerPlacement}],school_info:null,nfl_info:null} as unknown as PreviewLockerRow).videos[0].lockerPlacement).toBe(lockerPlacement);
 await act(async()=>root.render(<LockerView data={data}/>));
 for(const category of ["PODCAST","SOCIAL"] as const){
  await mediaTab(category);
  const selected=lockerPlacement==="both" || lockerPlacement===category.toLowerCase();
  const card=host.querySelector<HTMLAnchorElement>('.locker-media-video-card');
  expect(!!card).toBe(selected);
  if(selected){expect(card!.textContent).toContain(external.title);expect(card!.getAttribute("href")).toBe(`/preview-lockers/fixture-player/videos/${external.id}`);expect(card!.querySelector('img')!.src).toContain('i.ytimg.com/vi/abcdefghijk/');expect(host.textContent).not.toContain("No social posts added yet.");expect(host.textContent).not.toContain("The mic is waiting");}
 }
});
it("keeps existing videos Film Room-only until placement is chosen and removes cards when video is removed",async()=>{
 await act(async()=>root.render(<LockerView data={previewLockerData(record)}/>));
 await mediaTab("PODCAST");expect(host.querySelector('.locker-media-video-card')).toBeNull();expect(host.textContent).toContain("The mic is waiting");
 await mediaTab("SOCIAL");expect(host.textContent).toContain("No social posts added yet.");
 await act(async()=>root.render(<LockerView data={previewLockerData({...record,videos:[{...external,lockerPlacement:"both"}]})}/>));
 expect(host.querySelector('.locker-media-video-card')).not.toBeNull();
 await act(async()=>root.render(<LockerView data={previewLockerData({...record,videos:[]})}/>));
 expect(host.querySelector('.locker-media-video-card')).toBeNull();
});
it("maps signed uploads without duplicating videos and preserves placement through repeat scraper runs",()=>{
 const saved=previewContent.parse({...content,videos:[{...external,lockerPlacement:"both"},{...stored,lockerPlacement:"social"}]});
 const suggestion=previewContent.parse({...content,videos:[{...external,id:"new-id",lockerPlacement:"podcast"},{id:"new-video",title:"New clip",url:"https://www.youtube.com/watch?v=lmnopqrstuv",thumb:null}]});
 const merged=mergeSuggestions(saved,suggestion);expect(merged.videos).toHaveLength(3);expect(merged.videos.slice(0,2)).toEqual(saved.videos);
 const resolved={...record,...saved,videos:[{...external,lockerPlacement:"both"},{...stored,lockerPlacement:"social",url:"https://media.example.com/signed.mp4?token=fixture"}]} as ResolvedPreviewRecord;
 const data=previewLockerData(resolved);expect(data.videos).toHaveLength(2);expect(data.videos[1]).toMatchObject({lockerPlacement:"social",playbackUrl:"https://media.example.com/signed.mp4?token=fixture"});
 expect(previewLockerData({...record,...saved}).videos).toHaveLength(1);
});
it("validates placement without relaxing existing video rules",()=>{
 for(const video of [external,stored]){
  expect(previewVideo.safeParse(video).success).toBe(true);
  for(const lockerPlacement of ["podcast","social","both"])expect(previewVideo.safeParse({...video,lockerPlacement}).success).toBe(true);
  for(const lockerPlacement of [null,"",[],"news","<script>"])expect(previewVideo.safeParse({...video,lockerPlacement}).success).toBe(false);
 }
 expect(previewVideo.safeParse({...external,lockerPlacement:"both",url:"javascript:alert(1)"}).success).toBe(false);
 expect(previewVideo.safeParse({...stored,lockerPlacement:"both",storagePath:"outside.mp4"}).success).toBe(false);
});
