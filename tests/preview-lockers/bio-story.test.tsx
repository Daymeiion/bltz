import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import LockerView from "@/app/player/[slug]/LockerView";
import { previewContent } from "@/lib/preview-lockers/validation";
import { previewLockerData, toLockerData } from "@/lib/preview-lockers/mapper";
import { mergeSuggestions } from "@/lib/preview-lockers/merge-suggestions";
import { discoveryDraft } from "@/lib/preview-lockers/discovery";
import type { PreviewLockerRow } from "@/lib/preview-lockers/types";
vi.mock("@/lib/analytics/client", () => ({ trackProductEvent: vi.fn() }));
const bio="A short overview of the athlete’s career.";
const story="Early life and family.\n\nCollege and the professional journey.\n\nLife after football.";
const content=previewContent.parse({slug:"fixture-player",full_name:"Fixture Player",bio,story});
const record={...content,id:"00000000-0000-4000-8000-000000000001",revision:1,created_at:"",updated_at:""};
let host:HTMLDivElement,root:Root,fetcher:ReturnType<typeof vi.fn>;
beforeEach(()=>{host=document.createElement("div");document.body.append(host);root=createRoot(host);fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);vi.stubGlobal("IntersectionObserver",class{observe(){}unobserve(){}disconnect(){}});vi.stubGlobal("ResizeObserver",class{observe(){}disconnect(){}});});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
async function fill(label:string,value:string){const input=host.querySelector<HTMLTextAreaElement>(`[aria-label="${label}"]`)!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value")!.set!.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}));});}
async function save(revision:number){fetcher.mockResolvedValueOnce(Response.json({id:record.id,slug:record.slug,revision}));await act(async()=>[...host.querySelectorAll("button")].find(b=>b.textContent==="Save draft")!.click());return JSON.parse(fetcher.mock.calls.at(-1)![1].body).content;}
it("saves and reloads the short Bio and longer Story independently, with explicit Story clearing",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record}/>));
 expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Life story"]')!.maxLength).toBe(20000);
 await fill("Biography","Edited short bio.");await fill("Life story",story+"\n\nAdditional personal history.");
 const saved=await save(2);expect(saved).toMatchObject({bio:"Edited short bio.",story:story+"\n\nAdditional personal history."});
 await act(async()=>root.render(<PreviewLockerForm key="reload" record={{...record,...saved,revision:2}}/>));
 expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Biography"]')!.value).toBe(saved.bio);
 expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Life story"]')!.value).toBe(saved.story);
 await fill("Life story","");expect(await save(3)).toMatchObject({bio:saved.bio,story:""});
});
it.each([false,true])("displays distinct Bio and Story copy with paragraph breaks (preview=%s)",async preview=>{
 const data=previewLockerData(record);if(!preview)data.lockerHref=undefined;
 await act(async()=>root.render(<LockerView data={data}/>));
 expect(host.textContent).toContain(bio);expect(host.textContent).not.toContain(story);
 await act(async()=>[...host.querySelectorAll("button")].find(b=>b.textContent==="STORY")!.click());
 expect(host.textContent).toContain(story);expect(host.textContent).not.toContain(bio);
 expect([...host.querySelectorAll('p')].find(p=>p.textContent===story)?.style.whiteSpace).toBe('pre-line');
});
it("does not reuse an existing Bio when Life Story is empty",async()=>{
 await act(async()=>root.render(<LockerView data={previewLockerData({...record,story:""})}/>));
 await act(async()=>[...host.querySelectorAll("button")].find(b=>b.textContent==="STORY")!.click());
 expect(host.textContent).toContain("Life story has not been added yet.");expect(host.textContent).not.toContain(bio);expect(host.textContent).not.toContain("Early Life:");
});
it("keeps authored Story and Bio through repeated scraper runs and never auto-fills Story",()=>{
 const suggestion=previewContent.parse({...content,bio:"Replacement scrape",story:"Generated replacement"});
 expect(mergeSuggestions(content,suggestion)).toMatchObject({bio,story});
 expect(mergeSuggestions({...content,story:""},suggestion).story).toBe("");
 const discovered=discoveryDraft({full_name:"Fixture Player",school:null,position:null,level:null});
 expect(discovered.story).toBe("");
 const {story:_omitted,...legacy}=content;expect(previewContent.parse(legacy)).toMatchObject({bio,story:""});
});
it("maps both fields through the legacy preview adapter and validates Story separately",()=>{
 const row={...record,school_info:null,nfl_info:null} as unknown as PreviewLockerRow;
 expect(toLockerData(row)).toMatchObject({bio,story});
 expect(previewContent.safeParse({...content,story:"x".repeat(20000)}).success).toBe(true);
 expect(previewContent.safeParse({...content,story:"x".repeat(20001)}).success).toBe(false);
 expect(previewContent.safeParse({...content,story:"bad\u0001control"}).success).toBe(false);
});
