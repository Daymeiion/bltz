import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import { previewContent } from "@/lib/preview-lockers/validation";
import { mergeSuggestions } from "@/lib/preview-lockers/merge-suggestions";
const storage=vi.hoisted(()=>({upload:vi.fn(),sign:vi.fn()}));
vi.mock("@/lib/supabase/client",()=>({createClient:()=>({storage:{from:()=>({uploadToSignedUrl:storage.upload,createSignedUrl:storage.sign})}})}));
const id="00000000-0000-4000-8000-000000000001",path=`${id}/photos/00000000-0000-4000-8000-000000000002.png`;
const defaultUrl="https://college.example.com/scraped.png",uploadedUrl="https://storage.example.com/uploaded.png";
const record={...previewContent.parse({slug:"fixture-player",full_name:"Fixture Player",schools:[{label:"Fixture Community College",color:"#152238",logo:defaultUrl}]}),id,revision:1,created_at:"",updated_at:""};
let host:HTMLDivElement,root:Root,fetcher:ReturnType<typeof vi.fn>;
beforeEach(()=>{vi.resetAllMocks();host=document.createElement("div");document.body.append(host);root=createRoot(host);fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);storage.upload.mockResolvedValue({error:null});storage.sign.mockResolvedValue({data:{signedUrl:uploadedUrl},error:null});});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
const image=()=>host.querySelector<HTMLImageElement>('img[alt="Fixture Community College image"]');
async function click(text:string){await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent===text)!.click());}
async function upload(file=new File(['image'],'logo.png',{type:'image/png'})){
 const input=host.querySelector<HTMLInputElement>('[aria-label="School 1 upload image"]')!;
 Object.defineProperty(input,'files',{configurable:true,value:[file]});
 await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
}
it("starts with the scraped logo, saves an upload separately, reloads it, and can restore the default",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record}/>));expect(image()?.src).toBe(defaultUrl);
 fetcher.mockResolvedValueOnce(Response.json({path,token:'ticket',bucket:'preview-locker-photos'}));await upload();expect(image()?.src).toBe(uploadedUrl);
 expect(JSON.parse(fetcher.mock.calls[0][1].body).kind).toBe('school_logo');
 fetcher.mockResolvedValueOnce(Response.json({id,slug:record.slug,revision:2}));await click('Save draft');
 const payload=JSON.parse(fetcher.mock.calls[1][1].body);
 expect(payload.content.schools[0]).toMatchObject({logo:defaultUrl,logoStoragePath:path});expect(payload.content.photos).toEqual([]);expect(JSON.stringify(payload)).not.toContain(uploadedUrl);
 const merged=mergeSuggestions(payload.content,previewContent.parse({slug:record.slug,full_name:record.full_name,schools:[{...record.schools[0],logo:"https://college.example.com/new-scrape.png"}]}));
 expect(merged.schools[0].logoStoragePath).toBe(path);
 await act(async()=>root.render(<PreviewLockerForm key="reload" record={{...record,...payload.content,revision:2}} initialImageUrls={{[path]:uploadedUrl}}/>));expect(image()?.src).toBe(uploadedUrl);
 await click('Use default image');expect(image()?.src).toBe(defaultUrl);
 fetcher.mockResolvedValueOnce(Response.json({id,slug:record.slug,revision:3}));await click('Save draft');expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body).content.schools[0]).toMatchObject({logo:defaultUrl,logoStoragePath:null});
});
it("retains the default when uploads fail or use an unsupported type or size",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record}/>));
 await upload(new File(['x'],'bad.svg',{type:'image/svg+xml'}));expect(fetcher).not.toHaveBeenCalled();
 const huge=new File(['x'],'large.png',{type:'image/png'});Object.defineProperty(huge,'size',{value:10485761});await upload(huge);expect(fetcher).not.toHaveBeenCalled();
 fetcher.mockResolvedValueOnce(Response.json({path,token:'ticket',bucket:'preview-locker-photos'}));storage.upload.mockResolvedValueOnce({error:{message:'failed'}});await upload();expect(image()?.src).toBe(defaultUrl);expect(host.querySelector('[role="alert"]')?.textContent).toContain('current image is unchanged');
});
it("prevents school indices changing while an upload is pending",async()=>{
 let finish!:(value:unknown)=>void;storage.upload.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 await act(async()=>root.render(<PreviewLockerForm record={record}/>));fetcher.mockResolvedValueOnce(Response.json({path,token:'ticket',bucket:'preview-locker-photos'}));await upload();
 expect([...host.querySelectorAll('button')].find(button=>button.textContent==='Add school')?.disabled).toBe(true);
 expect([...host.querySelectorAll('button')].filter(button=>button.textContent==='Remove from draft').every(button=>button.disabled)).toBe(true);
 await act(async()=>finish({error:null}));expect(image()?.src).toBe(uploadedUrl);
});
it("allows a school without a scraped logo or directory entry to use an upload",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={{...record,schools:[{...record.schools[0],logo:null}]}}/>));expect(image()).toBeNull();
 fetcher.mockResolvedValueOnce(Response.json({path,token:'ticket',bucket:'preview-locker-photos'}));await upload();expect(image()?.src).toBe(uploadedUrl);
});
