import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import AwardImageLibrary from "@/app/admin/award-images/AwardImageLibrary";
import AwardImagePicker from "@/app/admin/preview-lockers/AwardImagePicker";
import { previewContent, type PreviewContent } from "@/lib/preview-lockers/validation";
const storage=vi.hoisted(()=>({upload:vi.fn()}));
vi.mock("@/lib/supabase/client",()=>({createClient:()=>({storage:{from:()=>({uploadToSignedUrl:storage.upload})}})}));
const id="00000000-0000-4000-8000-000000000001";
const image={id,title:"Shared trophy",active:true,asset_status:"placeholder",imageUrl:"https://cdn.example.com/trophy.png",image_source_url:null,image_license:null,attribution:null,revision:1};
const library={images:[image],catalog:[{id:"00000000-0000-4000-8000-000000000002",name:"Thorpe Award",slug:"thorpe-award",aliases:["Jim Thorpe Award"],active:true,image_asset_id:id}]};
let host:HTMLDivElement,root:Root,fetcher:ReturnType<typeof vi.fn>;
beforeEach(()=>{host=document.createElement("div");document.body.append(host);root=createRoot(host);fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
const button=(text:string)=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(item=>item.textContent===text)!;
async function click(text:string){await act(async()=>button(text).click());}
it("chooses an image without review, closes the picker, and persists the selection",async()=>{
 let saved:PreviewContent["awards"][number]={label:"Jim Thorpe Award",year:"2007"};
 function Editor(){const [award,setAward]=useState(saved);return <AwardImagePicker award={award} onChange={patch=>{saved={...award,...patch};setAward(saved);}}/>;}
 fetcher.mockResolvedValue(Response.json(library));
 await act(async()=>root.render(<Editor/>));await click("Choose award image");
 expect(document.querySelector('[aria-label="Award catalog match"]')).toBeNull();
 expect(document.body.textContent).not.toContain("usage permission");
 await click("Shared trophy");expect(saved).toMatchObject({imageMode:"custom",imageAssetId:id,photoId:null});
 const reloaded=previewContent.parse({slug:"fixture-player",full_name:"Fixture Player",awards:[saved]}).awards[0];expect(reloaded.imageAssetId).toBe(id);
 expect(document.querySelector('[role="dialog"]')).toBeNull();
 expect(host.querySelector<HTMLImageElement>('img')?.src).toBe(image.imageUrl);
 await click("Choose award image");expect(button("Shared trophy").getAttribute("aria-pressed")).toBe("true");
 await act(async()=>document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true})));
 await click("Remove image");expect(saved).toMatchObject({imageMode:"none",imageAssetId:null});
});
it("continues a multi-file upload after a failure and reports saved duplicates without replacing stored images",async()=>{
 vi.stubGlobal("crypto",{subtle:{digest:async()=>new Uint8Array(32).buffer}});
 let tickets=0,finalized=0;
 fetcher.mockImplementation(async(url:string,options?:RequestInit)=>{
  if(url.endsWith('/imports'))return Response.json({candidates:[]});
  if(url.endsWith('/uploads')&&options?.method==='POST'){tickets++;return Response.json(tickets===3?{duplicate:true,id}:{path:'images/hash.png',token:'ticket',bucket:'award-library'});}
  if(url.endsWith('/uploads')&&options?.method==='PATCH'){finalized++;return Response.json({id});}
  return Response.json(library);
 });
 storage.upload.mockRejectedValueOnce(new Error('Temporary failure')).mockResolvedValue({error:null});
 await act(async()=>root.render(<AwardImageLibrary/>));
 const input=host.querySelector<HTMLInputElement>('[aria-label="Upload award images"]')!;
 expect(input.multiple).toBe(true);
 expect(host.querySelectorAll('input[type="file"]')).toHaveLength(1);
 expect(host.textContent).not.toMatch(/Source URL|Needs display review|Award name mappings|Import from existing|Filename match/i);
 const files=['failed.png','saved.png','same.png'].map(name=>{const file=new File(['image'],name,{type:'image/png'});Object.defineProperty(file,'arrayBuffer',{value:async()=>new Uint8Array([137,80,78,71,13,10,26,10]).buffer});return file;});
 Object.defineProperty(input,'files',{value:files});
 await act(async()=>{input.dispatchEvent(new Event('change',{bubbles:true}));});
 await vi.waitFor(async()=>{await act(async()=>{});expect(host.textContent).toContain('1 uploaded · 1 already saved · 1 skipped or failed.');});
 expect(tickets).toBe(3);expect(finalized).toBe(1);expect(host.textContent).toContain('Shared trophy');
 const finalize=fetcher.mock.calls.find(([url,options])=>url.endsWith('/uploads')&&options?.method==='PATCH');
 expect(JSON.parse(finalize![1].body).details).toMatchObject({image_source_url:null,image_license:null,attribution:null});
});

it("confirms removal, hides the image after reload, and restores it with the current revision", async () => {
 let stored = { ...image };
 fetcher.mockImplementation(async (_url: string, options?: RequestInit) => {
  if (options?.method === "DELETE" || options?.method === "PATCH") {
   expect(JSON.parse(options.body as string).revision).toBe(stored.revision);
   stored = { ...stored, active: options.method === "PATCH", revision: stored.revision + 1 };
   return Response.json({ id, active: stored.active, revision: stored.revision });
  }
  return Response.json({ ...library, images: [stored] });
 });
 await act(async () => root.render(<AwardImageLibrary />));
 await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Remove Shared trophy"]')!.click());
 expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("Award records are preserved");
 expect(fetcher.mock.calls.filter(([, options]) => options?.method === "DELETE")).toHaveLength(0);
 await click("Cancel");
 expect(host.querySelector('figure')).not.toBeNull();
 await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Remove Shared trophy"]')!.click());
 await act(async () => document.querySelector<HTMLButtonElement>('[role="alertdialog"] button:last-child')!.click());
 expect(stored.active).toBe(false);
 expect(host.querySelector('figure')).toBeNull();
 expect(document.querySelector('[role="alertdialog"]')).toBeNull();
 expect(host.textContent).toContain("removed from the library");
 await click("Refresh");
 expect(host.querySelector('figure')).toBeNull();
 await act(async () => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
 expect(host.querySelector('figure')?.textContent).toContain("Removed");
 await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Restore Shared trophy"]')!.click());
 expect(stored.active).toBe(true);
 expect(host.querySelector('[aria-label="Remove Shared trophy"]')).not.toBeNull();
 expect(host.textContent).toContain("restored to the library");
});

it("keeps failed removals visible and provides a refresh path for stale images", async () => {
 fetcher.mockImplementation(async (_url: string, options?: RequestInit) => options?.method === "DELETE"
  ? Response.json({ error: "award_image_changed" }, { status: 409 }) : Response.json(library));
 await act(async () => root.render(<AwardImageLibrary />));
 await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Remove Shared trophy"]')!.click());
 await act(async () => document.querySelector<HTMLButtonElement>('[role="alertdialog"] button:last-child')!.click());
 expect(document.querySelector('[role="alertdialog"] [role="alert"]')?.textContent).toContain("Cancel and refresh");
 expect(host.querySelector('figure')).not.toBeNull();
 await click("Cancel");
 await click("Refresh");
 expect(host.querySelector('[role="alert"]')).toBeNull();
});

it("withholds removed images from the award picker", async () => {
 fetcher.mockResolvedValue(Response.json({ ...library, images: [{ ...image, active: false }] }));
 await act(async () => root.render(<AwardImagePicker award={{ label: "Award", year: "2007" }} onChange={vi.fn()} />));
 await click("Choose award image");
 expect(document.querySelector('[role="dialog"]')?.textContent).toContain("No images yet");
 expect(button("Shared trophy")).toBeUndefined();
});
