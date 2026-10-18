import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import AwardImageMatches from "@/app/admin/award-images/AwardImageMatches";
import type { AwardImageLibrary } from "@/lib/award-images/model";
const library = {
  images:[{id:"thorpe-img",title:"Thorpe",original_filename:"Jim-Thorpe-Award.png",active:true,asset_status:"approved",revision:3,imageUrl:"https://cdn.example.com/thorpe.png"},{id:"heisman-img",title:"Heisman",original_filename:"Heisman-Trophy.webp",active:true,asset_status:"placeholder",revision:1,imageUrl:"https://cdn.example.com/heisman.webp"}],
  catalog:[{id:"thorpe",name:"Thorpe Award",slug:"thorpe-award",aliases:["Jim Thorpe Award"],active:true,updated_at:"2026-10-17T12:00:00.123456+00:00",image_asset_id:null},{id:"heisman",name:"Heisman Trophy",slug:"heisman-trophy",aliases:[],active:true,updated_at:"2026-10-17T12:00:00Z",image_asset_id:null}],
} as AwardImageLibrary;
let host:HTMLDivElement,root:Root,fetcher:ReturnType<typeof vi.fn>;
let reload=vi.fn<()=>Promise<void>>();
beforeEach(()=>{host=document.createElement("div");document.body.append(host);root=createRoot(host);fetcher=vi.fn();reload=vi.fn<()=>Promise<void>>().mockResolvedValue(undefined);vi.stubGlobal("fetch",fetcher);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
const button=(name:string)=>[...host.querySelectorAll<HTMLButtonElement>("button")].find(row=>row.textContent===name)!;
async function click(name:string){expect(button(name),name).toBeTruthy();await act(async()=>button(name).click());}
const boxes=()=>[...host.querySelectorAll<HTMLInputElement>('input[aria-label^="Select "]')];
async function render(data=library){await act(async()=>root.render(<AwardImageMatches library={data} busy={false} onReload={async()=>{await reload();}} onReview={()=>{}}/>));}
it("reviews and approves multiple clear filename matches with their original revisions",async()=>{
 await render();expect(host.textContent).toContain("Image display review pending");
 await click("Select clear matches");expect(boxes().filter(row=>row.checked)).toHaveLength(2);
 fetcher.mockResolvedValue(Response.json({saved:2,unchanged:0}));await click("Approve selected matches (2)");
 const body=JSON.parse(fetcher.mock.calls[0][1].body);
 expect(body.matches).toEqual(expect.arrayContaining([{award_id:"thorpe",image_asset_id:"thorpe-img",award_updated_at:library.catalog[0].updated_at,image_revision:3}]));
 expect(body.matches).toHaveLength(2);expect(fetcher).toHaveBeenCalledTimes(1);expect(reload).toHaveBeenCalledOnce();
 expect(host.textContent).toContain("2 mappings saved. 1 selected images still need display review.");expect(boxes().every(row=>!row.checked)).toBe(true);
});
it("requires choosing one image for a competing award and never mass-selects a replacement",async()=>{
 const data={...library,images:[...library.images,{...library.images[0],id:"alternative",original_filename:"Thorpe-Trophy.png"}],catalog:library.catalog.map(row=>row.id==="heisman"?{...row,image_asset_id:"old-image"}:row)};
 await render(data);expect(button("Select clear matches").disabled).toBe(true);expect(host.textContent).not.toContain("Replaces current default");
 const thorpe=boxes();await act(async()=>thorpe[0].click());await act(async()=>thorpe[1].click());expect(boxes().filter(row=>row.checked)).toHaveLength(1);expect(thorpe[0].checked).toBe(false);
 await act(async()=>host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
 expect(host.textContent).toContain("Replaces current default");expect(button("Select clear matches").disabled).toBe(true);expect(boxes().every(row=>!row.checked)).toBe(true);
});
it("keeps the reviewed snapshot on library changes and clears a stale batch only when reloaded",async()=>{
 await render();await click("Select clear matches");
 await render({...library,catalog:library.catalog.map(row=>({...row,updated_at:"2026-10-18T01:00:00Z"}))});
 fetcher.mockResolvedValue(Response.json({error:"award_matches_changed"},{status:409}));await click("Approve selected matches (2)");
 expect(JSON.parse(fetcher.mock.calls[0][1].body).matches[0].award_updated_at).not.toBe("2026-10-18T01:00:00Z");
 expect(host.textContent).toContain("No mappings in this batch were changed");expect(reload).not.toHaveBeenCalled();
 await click("Reload suggestions");expect(boxes().every(row=>!row.checked)).toBe(true);
});
