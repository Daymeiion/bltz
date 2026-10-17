import {act} from "react";
import {createRoot, type Root} from "react-dom/client";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import {previewContent} from "@/lib/preview-lockers/validation";
import {newsReviewSchema} from "@/lib/preview-lockers/news-review";
import {merchandiseReviewSchema} from "@/lib/preview-lockers/merchandise-review";
const record={...previewContent.parse({slug:"fixture-player",full_name:"Fixture Player",school:"Cal"}),id:"00000000-0000-4000-8000-000000000001",revision:3,created_at:"",updated_at:""};
const news=newsReviewSchema.parse({version:3,searched_at:null,identity_key:"a".repeat(64),articles:[1,2].map(n=>({headline:`Fixture Player football ${n}`,article_url:`https://press.example.com/${n}`,canonical_url:`https://press.example.com/${n}`,publisher:"Press",source_domain:"press.example.com",author:null,published_at:null,thumbnail_url:null,summary:"Football at Cal",metadata:{extraction:"NewsArticle"},discovery_source:"fixture",discovered_at:"2020-01-01",confidence:0.95,relevance_score:0.95,featured:false}))});
const merch=merchandiseReviewSchema.parse({version:3,searched_at:"2026-10-17T00:00:00Z",identity_key:"a".repeat(64),dismissed_urls:[],result:{status:"complete",candidates:3,rejected:0,errors:[],items:[1,2,3].map(n=>({title:`Fixture Player football card ${n}`,category:"trading_card",productUrl:`https://shop.example.com/${n}`,canonicalUrl:`https://shop.example.com/${n}`,imageUrl:null,retailer:null,priceLabel:null,availability:"unknown",description:"Card",matchedAffiliations:["Cal"]}))}});
let host: HTMLDivElement,root: Root,fetcher: ReturnType<typeof vi.fn>;
beforeEach(()=>{host=document.createElement("div");document.body.append(host);root=createRoot(host);fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
const queue=(kind:string)=>host.querySelector<HTMLElement>(`section[aria-label="${kind==="news"?"News articles for review":"Merchandise search results"}"]`)!;
const actions=(kind:string)=>queue(kind).querySelector<HTMLElement>('[role="group"]')!;
const button=(text:string,scope:ParentNode=host)=>[...scope.querySelectorAll<HTMLButtonElement>('button')].find(x=>x.textContent===text)!;
async function click(text:string,scope:ParentNode=host){expect(button(text,scope),text).toBeTruthy();await act(async()=>button(text,scope).click());}
async function confirm(kind:string){await act(async()=>actions(kind).querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());}
async function render(value=record){await act(async()=>root.render(<PreviewLockerForm record={value} initialNewsReview={news} initialMerchandiseReview={merch} />));}
const urls=(kind:string)=>kind==="news"?news.articles.map(x=>x.article_url):merch.result.items.map(x=>x.productUrl);
it("adds selected news and merchandise together without stale state, duplicates or automatic publication",async()=>{
 await render();
 for(const kind of ["news","merchandise"]){
  await click("Select all",actions(kind));expect(button("Add selected to draft",actions(kind)).disabled).toBe(true);await confirm(kind);expect(button("Add selected to draft",actions(kind)).disabled).toBe(false);
  await click("Add selected to draft",actions(kind));expect(actions(kind).textContent).toContain("0 selected");
  expect(queue(kind).querySelectorAll('button:disabled')).not.toHaveLength(0);
 }
 expect(host.querySelectorAll('[aria-label^="Added article "][aria-label$=" headline"]')).toHaveLength(2);
 expect(host.querySelectorAll('[aria-label^="Merchandise "][aria-label$=" title"]')).toHaveLength(3);
 expect(fetcher).not.toHaveBeenCalled();
 await click("Select all",actions("news"));expect(actions("news").textContent).toContain("0 ready to add");expect(button("Add selected to draft",actions("news")).disabled).toBe(true);
 fetcher.mockResolvedValueOnce(Response.json({id:record.id,slug:record.slug,revision:4}));await click("Save draft");
 const payload=JSON.parse(fetcher.mock.calls[0][1].body);expect(payload.content.article_edits).toHaveLength(2);expect(payload.content.merchandise).toHaveLength(3);expect(payload.content.pfr_stats).toEqual(record.pfr_stats);
});
it.each(["news","merchandise"])("selects individually, clears and requires fresh review when selection changes: %s",async kind=>{
 await render();const checkboxes=()=>[...queue(kind).querySelectorAll<HTMLInputElement>('input[aria-label^="Select "]')];
 await act(async()=>checkboxes()[0].click());expect(actions(kind).textContent).toContain("1 selected");await confirm(kind);
 await act(async()=>checkboxes()[1].click());expect(actions(kind).querySelector<HTMLInputElement>('input')?.checked).toBe(false);expect(button("Add selected to draft",actions(kind)).disabled).toBe(true);
 await click("Select all",actions(kind));expect(checkboxes().every(x=>x.checked)).toBe(true);
 await click("Clear selection",actions(kind));expect(checkboxes().every(x=>!x.checked)).toBe(true);expect(button("Dismiss selected",actions(kind)).disabled).toBe(true);
 await act(async()=>{checkboxes()[0].click();checkboxes()[1].click();});expect(actions(kind).textContent).toContain("2 selected");
});
it.each(["news","merchandise"])("keeps failed selections and dismisses a successful batch in one request without changing draft content: %s",async kind=>{
 await render();await click("Select all",actions(kind));await confirm(kind);await click("Add selected to draft",actions(kind));await click("Select all",actions(kind));
 fetcher.mockResolvedValueOnce(Response.json({error:"preview_conflict"},{status:409}));await click("Dismiss selected",actions(kind));
 expect(queue(kind).querySelectorAll('article')).toHaveLength(urls(kind).length);expect(actions(kind).textContent).toContain(`${urls(kind).length} selected`);expect(host.textContent).toContain("queue changed");
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({revision:3,version:3,urls:urls(kind)});expect(fetcher.mock.calls[0][1].method).toBe("PATCH");
 fetcher.mockResolvedValueOnce(Response.json(kind==="news"?{revision:3,review:{...news,version:4,articles:[]}}:{revision:3,review:{...merch,version:4,dismissed_urls:urls(kind)}}));
 await click("Dismiss selected",actions(kind));expect(queue(kind).querySelectorAll('article')).toHaveLength(0);expect(fetcher).toHaveBeenCalledTimes(2);
 expect(host.querySelectorAll(kind==="news"?'[aria-label^="Added article "][aria-label$=" headline"]':'[aria-label^="Merchandise "][aria-label$=" title"]')).toHaveLength(urls(kind).length);
});
it("skips existing draft aliases and refuses batch overflow without partially adding",async()=>{
 const existing=merch.result.items[0];await render({...record,merchandise:[{id:"existing",title:existing.title,category:existing.category,productUrl:`${existing.productUrl}?utm_source=old`,imageUrl:null,retailer:null,priceLabel:null,visible:true}]});
 await click("Select all",actions("merchandise"));expect(actions("merchandise").textContent).toContain("2 ready to add");await confirm("merchandise");await click("Add selected to draft",actions("merchandise"));
 expect(host.querySelectorAll('[aria-label^="Merchandise "][aria-label$=" title"]')).toHaveLength(3);
 const crowded={...record,article_edits:previewContent.shape.article_edits.parse(Array.from({length:39},(_,i)=>({id:`manual-${i}`,sourceUrl:null,headline:`Manual article ${i}`,publisher:"Press",articleUrl:`https://manual.example.com/${i}`,visible:true})))};
 await act(async()=>root.render(<PreviewLockerForm key="crowded" record={crowded} initialNewsReview={news} />));
 await click("Select all",actions("news"));await confirm("news");expect(button("Add selected to draft",actions("news")).disabled).toBe(true);expect(actions("news").textContent).toContain("can hold 1 more item");
 expect(host.querySelectorAll('[aria-label^="Added article "][aria-label$=" headline"]')).toHaveLength(39);
 await act(async()=>queue("news").querySelectorAll<HTMLInputElement>('input[aria-label^="Select "]')[1].click());await confirm("news");await click("Add selected to draft",actions("news"));
 expect(host.querySelectorAll('[aria-label^="Added article "][aria-label$=" headline"]')).toHaveLength(40);
});
it("resets selections and confirmation when refreshed queue data arrives",async()=>{
 await render();await click("Select all",actions("news"));await confirm("news");
 fetcher.mockResolvedValueOnce(Response.json({revision:3,articles:[],review:{...news,version:4}}));await click("Reload saved articles");
 expect(actions("news").textContent).toContain("0 selected");expect(actions("news").querySelector<HTMLInputElement>('input')?.checked).toBe(false);
 expect([...queue("news").querySelectorAll<HTMLInputElement>('input[aria-label^="Select "]')].every(x=>!x.checked)).toBe(true);
});
