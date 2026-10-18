import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import AwardImageLibrary from "@/app/admin/award-images/AwardImageLibrary";
import AwardImagePicker from "@/app/admin/preview-lockers/AwardImagePicker";
import { previewContent, type PreviewContent } from "@/lib/preview-lockers/validation";
const storage=vi.hoisted(()=>({upload:vi.fn()}));
vi.mock("@/lib/supabase/client",()=>({createClient:()=>({storage:{from:()=>({uploadToSignedUrl:storage.upload})}})}));
const id="00000000-0000-4000-8000-000000000001";
const image={id,title:"Shared trophy",active:true,asset_status:"approved",imageUrl:"https://cdn.example.com/trophy.png",image_source_url:"https://bltz.vercel.app/awards",image_license:"Authorized",attribution:"BLTZ",revision:1};
const library={images:[image],catalog:[{id:"00000000-0000-4000-8000-000000000002",name:"Thorpe Award",slug:"thorpe-award",aliases:["Jim Thorpe Award"],active:true,image_asset_id:id}]};
let host:HTMLDivElement,root:Root,fetcher:ReturnType<typeof vi.fn>;
beforeEach(()=>{host=document.createElement("div");document.body.append(host);root=createRoot(host);fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
const button=(text:string)=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(item=>item.textContent===text)!;
async function click(text:string){await act(async()=>button(text).click());}
it("saves a reusable image selection in the award JSON and restores catalog/default and hidden choices",async()=>{
 let saved:PreviewContent["awards"][number]={label:"Jim Thorpe Award",year:"2007"};
 function Editor(){const [award,setAward]=useState(saved);return <AwardImagePicker award={award} onChange={patch=>{saved={...award,...patch};setAward(saved);}}/>;}
 fetcher.mockResolvedValue(Response.json(library));
 await act(async()=>root.render(<Editor/>));await click("Choose from Award Image Library");
 expect(document.body.textContent).toContain("Matched: Thorpe Award");
 await click("Shared trophy");expect(saved).toMatchObject({imageMode:"custom",imageAssetId:id,photoId:null});
 const reloaded=previewContent.parse({slug:"fixture-player",full_name:"Fixture Player",awards:[saved]}).awards[0];expect(reloaded.imageAssetId).toBe(id);
 await click("Hide award image");expect(saved).toMatchObject({imageMode:"none",imageAssetId:null});
 await click("Use catalog default");expect(saved).toMatchObject({imageMode:"auto",imageAssetId:null});await click("Done");
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
 expect(input.multiple).toBe(true);expect(host.querySelector('[webkitdirectory]')).toBeTruthy();
 const files=['failed.png','saved.png','same.png'].map(name=>{const file=new File(['image'],name,{type:'image/png'});Object.defineProperty(file,'arrayBuffer',{value:async()=>new Uint8Array([137,80,78,71,13,10,26,10]).buffer});return file;});
 Object.defineProperty(input,'files',{value:files});
 await act(async()=>{input.dispatchEvent(new Event('change',{bubbles:true}));});
 await vi.waitFor(async()=>{await act(async()=>{});expect(host.textContent).toContain('1 uploaded · 1 already saved · 1 skipped or failed.');});
 expect(tickets).toBe(3);expect(finalized).toBe(1);expect(host.textContent).toContain('Shared trophy');
});
