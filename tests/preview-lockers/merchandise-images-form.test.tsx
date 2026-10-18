import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import { previewContent } from "@/lib/preview-lockers/validation";
const storage=vi.hoisted(()=>({upload:vi.fn(),sign:vi.fn()}));
vi.mock("@/lib/supabase/client",()=>({createClient:()=>({storage:{from:()=>({uploadToSignedUrl:storage.upload,createSignedUrl:storage.sign})}})}));
const id="00000000-0000-4000-8000-000000000001",path=`${id}/photos/00000000-0000-4000-8000-000000000002.png`;
const defaultUrl="https://shop.example.com/scraped.png",uploadedUrl="https://storage.example.com/uploaded.png";
const record={...previewContent.parse({slug:"fixture-player",full_name:"Fixture Player",merchandise:[{id:"card",title:"Football card",category:"trading_card",productUrl:"https://shop.example.com/card",imageUrl:defaultUrl}]}),id,revision:1,created_at:"",updated_at:""};
let host:HTMLDivElement,root:Root,fetcher:ReturnType<typeof vi.fn>;
beforeEach(()=>{vi.resetAllMocks();host=document.createElement("div");document.body.append(host);root=createRoot(host);fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);storage.upload.mockResolvedValue({error:null});storage.sign.mockResolvedValue({data:{signedUrl:uploadedUrl},error:null});});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
const image=()=>host.querySelector<HTMLImageElement>('img[alt="Football card image"]');
async function click(text:string){await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent===text)!.click());}
async function upload(file=new File(['image'],'replacement.png',{type:'image/png'})){
 const input=host.querySelector<HTMLInputElement>('[aria-label="Merchandise 1 upload image"]')!;
 Object.defineProperty(input,'files',{configurable:true,value:[file]});
 await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
}
it("replaces the scraped image, persists only the private path, and restores the default after reload",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record}/>)); expect(image()?.src).toBe(defaultUrl);
 fetcher.mockResolvedValueOnce(Response.json({path,token:'ticket',bucket:'preview-locker-photos'})); await upload();
 expect(image()?.src).toBe(uploadedUrl);
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({kind:'merchandise',mimeType:'image/png'});
 fetcher.mockResolvedValueOnce(Response.json({id,slug:record.slug,revision:2})); await click('Save draft');
 const payload=JSON.parse(fetcher.mock.calls[1][1].body);
 expect(payload.content.merchandise[0]).toMatchObject({imageUrl:defaultUrl,imageStoragePath:path});
 expect(JSON.stringify(payload)).not.toContain(uploadedUrl);expect(payload.content.photos).toEqual([]);
 await act(async()=>root.render(<PreviewLockerForm key="reload" record={{...record,...payload.content,revision:2}} initialImageUrls={{[path]:uploadedUrl}}/>));
 expect(image()?.src).toBe(uploadedUrl); await click('Use default image');expect(image()?.src).toBe(defaultUrl);
 fetcher.mockResolvedValueOnce(Response.json({id,slug:record.slug,revision:3}));await click('Save draft');
 expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body).content.merchandise[0]).toMatchObject({imageUrl:defaultUrl,imageStoragePath:null});
});
it("keeps the current image on failed or invalid uploads and reports the error beside the product",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record}/>));
 await upload(new File(['video'],'bad.mp4',{type:'video/mp4'}));expect(fetcher).not.toHaveBeenCalled();expect(host.textContent).toContain('up to 10 MB');
 const oversized=new File(['x'],'large.png',{type:'image/png'});Object.defineProperty(oversized,'size',{value:10485761});await upload(oversized);expect(fetcher).not.toHaveBeenCalled();
 fetcher.mockResolvedValueOnce(Response.json({path,token:'ticket',bucket:'preview-locker-photos'}));storage.upload.mockResolvedValueOnce({error:{message:'failed'}});await upload();
 expect(host.querySelector('[role="alert"]')?.textContent).toContain('current image is unchanged'); expect(image()?.src).toBe(defaultUrl);
 expect(storage.sign).not.toHaveBeenCalled();expect(host.textContent).not.toContain('Use default image');
});
