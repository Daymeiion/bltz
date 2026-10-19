import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import LockerView from "@/app/player/[slug]/LockerView";
import { previewContent, previewMediaBelongsTo, type PreviewRecord } from "@/lib/preview-lockers/validation";
import { previewLockerData, previewHeadshot, previewBioHeadshot, toLockerData } from "@/lib/preview-lockers/mapper";
import { mergeSuggestions } from "@/lib/preview-lockers/merge-suggestions";
import type { PreviewLockerRow } from "@/lib/preview-lockers/types";
const mocks=vi.hoisted(()=>({from:vi.fn(),upload:vi.fn(),signed:vi.fn(),fetch:vi.fn()}));
vi.mock("@/lib/supabase/client",()=>({createClient:()=>({storage:{from:mocks.from}})}));
vi.mock("@/lib/analytics/client",()=>({trackProductEvent:vi.fn()}));
const id="00000000-0000-4000-8000-000000000001";
const path=`${id}/photos/00000000-0000-4000-8000-000000000002.png`;
const hero="https://images.example.com/hero.png",bio="https://images.example.com/bio.png";
const photo={id:"gallery-hero",title:"Original Hero",url:hero,level:"pro" as const,isHeadshot:true,inHeroSlideshow:false};
const content=previewContent.parse({slug:"fixture-player",full_name:"Fixture Player",photos:[photo,{...photo,id:"gallery-bio",title:"Separate Bio",url:bio,isHeadshot:false}]});
const record={...content,id,revision:1,created_at:"",updated_at:""};
let host:HTMLDivElement,root:Root;
beforeEach(()=>{vi.resetAllMocks();host=document.createElement("div");document.body.append(host);root=createRoot(host);vi.stubGlobal("fetch",mocks.fetch);vi.stubGlobal("IntersectionObserver",class{observe(){}unobserve(){}disconnect(){}});vi.stubGlobal("ResizeObserver",class{observe(){}disconnect(){}});mocks.from.mockReturnValue({uploadToSignedUrl:mocks.upload,createSignedUrl:mocks.signed});mocks.upload.mockResolvedValue({error:null});mocks.signed.mockResolvedValue({data:{signedUrl:"https://storage.example.com/signed.png"},error:null});});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
async function select(label:string,value:string){const el=host.querySelector<HTMLSelectElement>(`[aria-label="${label}"]`)!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value")!.set!.call(el,value);el.dispatchEvent(new Event("change",{bubbles:true}));});}
async function fill(label:string,value:string){const el=host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(el,value);el.dispatchEvent(new Event("input",{bubbles:true}));});}
async function click(text:string){await act(async()=>[...host.querySelectorAll("button")].find(b=>b.textContent===text)!.click());}
async function save(revision=2){mocks.fetch.mockResolvedValueOnce(Response.json({id,slug:record.slug,revision}));await click("Save draft");return previewContent.parse(JSON.parse(mocks.fetch.mock.calls.at(-1)![1].body).content);}
async function upload(target:"hero"|"bio",file=new File(["png"],"portrait.png",{type:"image/png"})){
 const el=host.querySelector<HTMLInputElement>(`[aria-label="Upload ${target} headshot image"]`)!;Object.defineProperty(el,"files",{configurable:true,value:[file]});await act(async()=>el.dispatchEvent(new Event("change",{bubbles:true})));
}
it("gives Info independent image selectors and saves/reloads Bio without changing Hero",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record}/>));
 expect(host.querySelector<HTMLSelectElement>('[aria-label="Hero headshot image"]')!.value).toBe("gallery-hero");
 expect(host.querySelector<HTMLSelectElement>('[aria-label="Bio headshot image"]')!.value).toBe("");
 await select("Bio headshot image","gallery-bio");const saved=await save();expect(saved.bio_headshot_url).toBe(bio);expect(saved.photos).toEqual(content.photos);
 await act(async()=>root.render(<PreviewLockerForm key="reload" record={{...record,...saved,revision:2}}/>));
 expect(host.querySelector<HTMLSelectElement>('[aria-label="Bio headshot image"]')!.value).toBe("gallery-bio");
 await fill("Hero headshot HTTPS URL","https://images.example.com/replaced-hero.png");const changed=await save(3);
 expect(previewHeadshot(changed)).toBe("https://images.example.com/replaced-hero.png");expect(previewBioHeadshot(changed)).toBe(bio);
 await click("Use Hero headshot");const reset=await save(4);expect(reset.bio_headshot_url).toBeNull();expect(previewBioHeadshot(reset)).toBe(previewHeadshot(reset));
});
it("renders the distinct Bio image while Hero retains its own portrait, with legacy fallback",async()=>{
 const data=previewLockerData({...record,bio_headshot_url:bio});await act(async()=>root.render(<LockerView data={data}/>));
 expect(host.querySelector<HTMLImageElement>('.bio-headshot-photo')!.getAttribute("src")).toBe(bio);
 expect(host.querySelector<HTMLImageElement>('.locker-hero-headshot')!.getAttribute("src")).toBe(hero);
 expect(toLockerData({...record,bio_headshot_url:bio,school_info:null,nfl_info:null} as unknown as PreviewLockerRow)).toMatchObject({headshotUrl:hero,bioHeadshotUrl:bio});
 expect(previewLockerData(record)).toMatchObject({headshotUrl:hero,bioHeadshotUrl:hero});
});
it.each(["hero","bio"] as const)("uploads an independent %s headshot even with a full gallery",async target=>{
 const photos=Array.from({length:40},(_,i)=>({...content.photos[i%2],id:`photo-${i}`,isHeadshot:i===0}));
 const existing={...record,photos,bio_headshot_url:bio,headshot_url:hero};
 await act(async()=>root.render(<PreviewLockerForm record={existing}/>));
 expect(host.querySelector<HTMLInputElement>(`[aria-label="Upload ${target} headshot image"]`)!.disabled).toBe(false);
 mocks.fetch.mockResolvedValueOnce(Response.json({path,bucket:"preview-locker-photos",token:"fixture"}));await upload(target);
 const saved=await save();expect(saved[target==="hero"?"headshot_storage_path":"bio_headshot_storage_path"]).toBe(path);
 expect(saved.photos).toHaveLength(40);expect(saved.headshot_url).toBe(hero);expect(saved.bio_headshot_url).toBe(bio);
 expect(saved[target==="hero"?"bio_headshot_storage_path":"headshot_storage_path"]).toBeNull();expect(mocks.upload).toHaveBeenCalled();
 expect(JSON.stringify(saved)).not.toContain("signed.png");
});
it("retains existing choices on upload failure and rejects unsupported files before a request",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={{...record,bio_headshot_url:bio}}/>));
 mocks.fetch.mockResolvedValueOnce(Response.json({path,bucket:"preview-locker-photos",token:"fixture"}));mocks.upload.mockResolvedValueOnce({error:{message:"failed"}});
 await upload("bio");expect(host.textContent).toContain("Headshot upload failed.");expect((await save()).bio_headshot_url).toBe(bio);
 mocks.fetch.mockClear();await upload("bio",new File(["no"],"no.svg",{type:"image/svg+xml"}));expect(mocks.fetch).not.toHaveBeenCalled();expect(host.textContent).toContain("up to 10 MB");
});
it("keeps a completed upload if its thumbnail cannot be signed",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record}/>));mocks.fetch.mockResolvedValueOnce(Response.json({path,bucket:"preview-locker-photos",token:"fixture"}));mocks.signed.mockRejectedValueOnce(new Error("unavailable"));await upload("bio");expect((await save()).bio_headshot_storage_path).toBe(path);
});
it("keeps both manual choices and the default-following choice through repeat scraper runs",()=>{
 const saved=previewContent.parse({...content,headshot_storage_path:path,bio_headshot_url:bio});
 const scraped=previewContent.parse({...content,headshot_storage_path:null,bio_headshot_url:"https://images.example.com/new.png",bio_headshot_storage_path:path});
 expect(mergeSuggestions(saved,scraped)).toMatchObject({headshot_storage_path:path,bio_headshot_url:bio,bio_headshot_storage_path:null});
 expect(mergeSuggestions(content,scraped)).toMatchObject({headshot_storage_path:null,bio_headshot_url:null,bio_headshot_storage_path:null});
});
it("checks ownership and image-only paths and falls back safely for unresolved uploads",()=>{
 expect(previewMediaBelongsTo(id,previewContent.parse({...content,headshot_storage_path:path,bio_headshot_storage_path:path}))).toBe(true);
 expect(previewMediaBelongsTo(id,previewContent.parse({...content,bio_headshot_storage_path:path.replace(id,"00000000-0000-4000-8000-000000000099")}))).toBe(false);
 for(const patch of [{headshot_storage_path:path.replace("photos","videos")},{bio_headshot_storage_path:"../evil.png"},{bio_headshot_url:"javascript:alert(1)"}])expect(previewContent.safeParse({...content,...patch}).success).toBe(false);
 expect(previewBioHeadshot({...content,bio_headshot_storage_path:path})).toBe(hero);
 const legacy={...record};delete (legacy as Partial<PreviewRecord>).headshot_storage_path;delete (legacy as Partial<PreviewRecord>).bio_headshot_url;delete (legacy as Partial<PreviewRecord>).bio_headshot_storage_path;expect(previewLockerData(previewContentToRecord(legacy)).bioHeadshotUrl).toBe(hero);
});
function previewContentToRecord(value:unknown):PreviewRecord {return {...record,...previewContent.parse(value && typeof value==="object"?Object.fromEntries(Object.keys(previewContent.shape).map(key=>[key,(value as Record<string,unknown>)[key]])):value)};}
