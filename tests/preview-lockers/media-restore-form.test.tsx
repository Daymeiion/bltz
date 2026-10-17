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
const button=(text:string,scope:ParentNode=host)=>[...scope.querySelectorAll<HTMLButtonElement>('button')].find(x=>x.textContent===text)!;
async function click(text:string,scope:ParentNode=host){expect(button(text,scope),text).toBeTruthy();await act(async()=>button(text,scope).click());}
const dismissed=(kind:string)=>host.querySelector<HTMLElement>(`section[aria-label="Dismissed ${kind==="news"?"articles":"listings"}"]`)!;
it.each(["news","merchandise"])("restores saved dismissed items, retains failed items and never adds to Locker: %s",async kind=>{
 const initialNews={...news,articles:news.articles.slice(1),dismissed_articles:news.articles.slice(0,1)};
 const initialMerch={...merch,result:{...merch.result,items:merch.result.items.slice(1)},dismissed_items:merch.result.items.slice(0,1),dismissed_urls:[merch.result.items[0].productUrl]};
 await act(async()=>root.render(<PreviewLockerForm record={record} initialNewsReview={initialNews} initialMerchandiseReview={initialMerch} />));
 expect(dismissed(kind).querySelectorAll('article')).toHaveLength(1);
 const target=kind==="news"?news.articles[0].article_url:merch.result.items[0].productUrl;
 fetcher.mockResolvedValueOnce(Response.json({error:"preview_conflict"},{status:409}));await click("Restore to review",dismissed(kind));
 expect(dismissed(kind).querySelectorAll('article')).toHaveLength(1);expect(host.textContent).toContain("queue changed");
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({revision:3,version:3,action:"restore",url:target});
 fetcher.mockResolvedValueOnce(Response.json(kind==="news"?{revision:3,review:{...news,version:4}}:{revision:3,review:{...merch,version:4}}));
 await click("Restore to review",dismissed(kind));expect(dismissed(kind).querySelectorAll('article')).toHaveLength(0);expect(queue(kind).querySelectorAll('article')).toHaveLength(kind==="news"?2:3);
 expect(host.querySelectorAll('[aria-label^="Added article "][aria-label$=" headline"], [aria-label^="Merchandise "][aria-label$=" title"]')).toHaveLength(0);
 // Reopen using the persisted response: restored item remains in review.
 await act(async()=>root.render(<PreviewLockerForm key="reopened" record={record} initialNewsReview={news} initialMerchandiseReview={merch} />));
 expect(dismissed(kind).querySelectorAll('article')).toHaveLength(0);expect(queue(kind).querySelectorAll('article')).toHaveLength(kind==="news"?2:3);
});
it("pages through dismissed news without discovery or draft writes",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record} initialNewsReview={{...news,dismissed_articles:news.articles,dismissed_has_more:true}} />));
 fetcher.mockResolvedValueOnce(Response.json({revision:3,articles:[],review:{...news,dismissed_articles:[news.articles[1]],dismissed_offset:200,dismissed_has_more:false}}));
 await click("Next dismissed articles",dismissed("news"));expect(fetcher.mock.calls[0][0]).toContain("?dismissedOffset=200");expect(dismissed("news").textContent).toContain("Page 2");
 expect(button("Next dismissed articles",dismissed("news")).disabled).toBe(true);expect(button("Previous dismissed articles",dismissed("news")).disabled).toBe(false);
});
it("blocks stale identity restoration and shows empty dismissed states",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record} initialNewsReview={{...news,dismissed_articles:news.articles}} newsReviewCurrent={false} initialMerchandiseReview={{...merch,dismissed_items:merch.result.items}} merchandiseReviewCurrent={false} />));
 for(const kind of ["news","merchandise"])expect([...dismissed(kind).querySelectorAll<HTMLButtonElement>('button')].every(x=>x.disabled)).toBe(true);
 expect(fetcher).not.toHaveBeenCalled();
});
it("pages a large merchandise archive locally and clamps the last page after restoration",async()=>{
 const archived=Array.from({length:201},(_,n)=>({...merch.result.items[0],title:`Archived card ${n}`,productUrl:`https://shop.example.com/archive/${n}`}));
 const initial={...merch,dismissed_items:archived,dismissed_urls:archived.map(x=>x.productUrl)};
 await act(async()=>root.render(<PreviewLockerForm record={record} initialMerchandiseReview={initial} />));
 expect(dismissed("merchandise").querySelectorAll('article')).toHaveLength(200);
 await click("Next dismissed listings",dismissed("merchandise"));expect(dismissed("merchandise").querySelectorAll('article')).toHaveLength(1);expect(dismissed("merchandise").textContent).toContain("Archived card 200");expect(fetcher).not.toHaveBeenCalled();
 fetcher.mockResolvedValueOnce(Response.json({revision:3,review:{...initial,version:4,dismissed_items:archived.slice(0,200),dismissed_urls:initial.dismissed_urls.slice(0,200),result:{...merch.result,items:[...merch.result.items,archived[200]]}}}));
 await click("Restore to review",dismissed("merchandise"));expect(dismissed("merchandise").querySelectorAll('article')).toHaveLength(200);expect(dismissed("merchandise").textContent).not.toContain("Page 2");
});

it.each(["news","merchandise"])("restores selected dismissed items in one request, retains failure selection and keeps Locker content separate: %s",async kind=>{
 const initialNews={...news,articles:[],dismissed_articles:news.articles};
 const initialMerch={...merch,result:{...merch.result,items:[]},dismissed_items:merch.result.items,dismissed_urls:merch.result.items.map(item=>item.productUrl)};
 await act(async()=>root.render(<PreviewLockerForm record={record} initialNewsReview={initialNews} initialMerchandiseReview={initialMerch} />));
 const area=dismissed(kind), checks=()=>[...area.querySelectorAll<HTMLInputElement>('input[aria-label^="Select dismissed "]')];
 expect(button("Restore selected",area).disabled).toBe(true);
 await act(async()=>{checks()[0].click();checks()[1].click();});expect(area.textContent).toContain("2 selected on this page");
 await click("Clear selection",area);expect(checks().every(item=>!item.checked)).toBe(true);
 await click("Select all on page",area);expect(checks().every(item=>item.checked)).toBe(true);
 fetcher.mockResolvedValueOnce(Response.json({error:"preview_conflict"},{status:409}));await click("Restore selected",area);
 const selectedUrls=kind==="news"?news.articles.map(item=>item.article_url):merch.result.items.map(item=>item.productUrl);
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({revision:3,version:3,action:"restore",urls:selectedUrls});
 expect(checks().every(item=>item.checked)).toBe(true);expect(queue(kind).querySelectorAll('article')).toHaveLength(0);
 fetcher.mockResolvedValueOnce(Response.json(kind==="news"?{revision:3,review:{...news,version:4}}:{revision:3,review:{...merch,version:4}}));
 await click("Restore selected",area);expect(dismissed(kind).querySelectorAll('article')).toHaveLength(0);expect(queue(kind).querySelectorAll('article')).toHaveLength(selectedUrls.length);
 expect(fetcher).toHaveBeenCalledTimes(2);expect(host.querySelectorAll('[aria-label^="Added article "][aria-label$=" headline"], [aria-label^="Merchandise "][aria-label$=" title"]')).toHaveLength(0);
});
it("clears dismissed selection on page and queue changes and blocks concurrent restore actions",async()=>{
 const archived=Array.from({length:201},(_,n)=>({...merch.result.items[0],title:`Archived card ${n}`,productUrl:`https://shop.example.com/archive/${n}`}));
 const initial={...merch,dismissed_items:archived,dismissed_urls:archived.map(item=>item.productUrl)};
 await act(async()=>root.render(<PreviewLockerForm record={record} initialMerchandiseReview={initial} />));
 await click("Select all on page",dismissed("merchandise"));expect(dismissed("merchandise").textContent).toContain("200 selected on this page");
 await click("Next dismissed listings",dismissed("merchandise"));expect(dismissed("merchandise").textContent).toContain("0 selected on this page");
 await click("Previous dismissed listings",dismissed("merchandise"));expect(dismissed("merchandise").textContent).toContain("0 selected on this page");
 await click("Select all on page",dismissed("merchandise"));
 let finish!: (value:Response)=>void;fetcher.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
 await click("Restore selected",dismissed("merchandise"));expect(button("Restore selected",dismissed("merchandise")).disabled).toBe(true);
 expect([...dismissed("merchandise").querySelectorAll<HTMLInputElement>('input')].every(item=>item.disabled)).toBe(true);
 await act(async()=>finish(Response.json({error:"merchandise_review_full"},{status:422})));
 expect(dismissed("merchandise").textContent).toContain("200 selected on this page");expect(host.textContent).toContain("queue is full");
 fetcher.mockResolvedValueOnce(Response.json({revision:3,review:{...initial,version:4},result:merch.result}));await click("Search merchandise");
 expect(dismissed("merchandise").textContent).toContain("0 selected on this page");
});
