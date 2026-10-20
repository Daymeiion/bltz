import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import { previewContent } from "@/lib/preview-lockers/validation";
import { newsReviewSchema } from "@/lib/preview-lockers/news-review";
const record = { ...previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player", school: "Cal" }), id: "00000000-0000-4000-8000-000000000001", revision: 3, created_at: "", updated_at: "" };
const article = { headline: "Fixture Player's Cal football career", article_url: "https://press.example.com/story", canonical_url: "https://press.example.com/story", publisher: "Press", source_domain: "press.example.com", author: null, published_at: null, thumbnail_url: null, summary: "Football at Cal", metadata: { extraction: "NewsArticle" }, discovery_source: "fixture", discovered_at: "2020-01-01", confidence: 0.95, relevance_score: 0.95, featured: false };
const review = newsReviewSchema.parse({ articles: [article], version: 2, searched_at: "2026-10-17T00:00:00Z", identity_key: "a".repeat(64) });
let host: HTMLDivElement, root: Root, fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); host=document.createElement("div");document.body.append(host);root=createRoot(host);fetcher=vi.fn();vi.stubGlobal("fetch",fetcher); });
afterEach(async () => { await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals(); });
const queue=()=>host.querySelector<HTMLElement>('section[aria-label="News articles for review"]')!;
const button=(text: string, scope: ParentNode=host)=>[...scope.querySelectorAll<HTMLButtonElement>('button')].find(x=>x.textContent===text)!;
async function click(text: string, scope: ParentNode=host){expect(button(text,scope),text).toBeTruthy();await act(async()=>button(text,scope).click());}
it("reopens saved pending articles without searching and requires review, Add and Save before Locker enrichment",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record} initialNewsReview={review} />));
 expect(fetcher).not.toHaveBeenCalled();expect(queue().textContent).toContain(article.headline);expect(queue().textContent).toContain("Last search");
 expect(button("Add to draft",queue()).disabled).toBe(true);expect(host.querySelector('[aria-label="Added article 1 headline"]')).toBeNull();
 await act(async()=>queue().querySelector<HTMLInputElement>('input[aria-label^="I reviewed this"]')!.click());await click("Add to draft",queue());
 expect(button("Edit article",queue()).disabled).toBe(false);expect(queue().querySelector('input[aria-label^="I reviewed this"]')).toBeNull();expect(queue().textContent).toContain("0 awaiting review");expect(host.querySelector<HTMLInputElement>('[aria-label="Added article 1 headline"]')?.value).toBe(article.headline);
 expect(fetcher).not.toHaveBeenCalled();
 fetcher.mockResolvedValueOnce(Response.json({id:record.id,slug:record.slug,revision:4}));await click("Save draft");
 const payload=JSON.parse(fetcher.mock.calls[0][1].body);expect(payload.content.article_edits).toEqual([expect.objectContaining({articleUrl:article.article_url,sourceUrl:article.article_url,visible:true})]);
 expect(payload.content.merchandise).toEqual([]);expect(payload.content.pfr_stats).toEqual(record.pfr_stats);
 await act(async()=>root.render(<PreviewLockerForm key="reopened" record={record} initialNewsReview={review} />));
 expect(queue().querySelector<HTMLInputElement>('input[aria-label^="I reviewed this"]')?.checked).toBe(false);
});
it("accepts accumulated search results above twelve without adding them to the Locker",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record} initialNewsReview={review} />));
 const merged={...review,version:3,articles:Array.from({length:15},(_,i)=>({...review.articles[0],headline:`Fixture Player football ${i}`,article_url:`https://press.example.com/${i}`,canonical_url:`https://press.example.com/${i}`}))};
 fetcher.mockResolvedValueOnce(Response.json({report:{status:"complete"}})).mockResolvedValueOnce(Response.json({revision:3,articles:[],review:merged}));await click("Refresh scraped news");
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({revision:3});expect(queue().querySelectorAll('article')).toHaveLength(15);
 expect(host.querySelector('[aria-label="Added article 1 headline"]')).toBeNull();
 fetcher.mockResolvedValueOnce(Response.json({report:{errors:["news_review_full"]}},{status:422})).mockResolvedValueOnce(Response.json({revision:3,articles:[],review:merged}));await click("Refresh scraped news");
 expect(queue().querySelectorAll('article')).toHaveLength(15);expect(host.textContent).toContain("existing articles are retained");
});
it("persists dismissal only after success, keeps edited Locker articles separate and retains failed dismissals",async()=>{
 const edit={id:"reviewed",sourceUrl:article.article_url,articleUrl:article.article_url,headline:article.headline,publisher:article.publisher,visible:true,imageUrl:null,summary:article.summary,publishedAt:null};
 await act(async()=>root.render(<PreviewLockerForm record={{...record,article_edits:[edit]}} initialNewsReview={review} />));
 expect(button("Edit article",queue()).disabled).toBe(false);expect(queue().querySelector('input[aria-label^="I reviewed this"]')).toBeNull();expect(queue().textContent).toContain("0 awaiting review");
 fetcher.mockResolvedValueOnce(Response.json({error:"preview_conflict"},{status:409}));await click("Dismiss article",queue());expect(queue().querySelectorAll('article')).toHaveLength(1);expect(host.textContent).toContain("queue changed");
 fetcher.mockResolvedValueOnce(Response.json({revision:3,review:{...review,version:3,articles:[]}}));await click("Dismiss article",queue());
 expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({revision:3,version:2,url:article.article_url});expect(fetcher.mock.calls[1][1].method).toBe("PATCH");
 expect(queue().querySelectorAll('article')).toHaveLength(0);expect(host.querySelector<HTMLInputElement>('[aria-label="Added article 1 headline"]')?.value).toBe(article.headline);
});
it("does not overwrite saved reviews with malformed, unsafe or stale responses",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record} initialNewsReview={review} />));
 fetcher.mockResolvedValueOnce(Response.json({articles:[],revision:4,review}));await click("Reload saved articles");expect(queue().textContent).toContain(article.headline);expect(host.textContent).toContain("preview changed");
 fetcher.mockResolvedValueOnce(Response.json({articles:[],revision:3,review:{...review,articles:[{...article,article_url:"javascript:alert(1)"}]}}));await click("Reload saved articles");
 expect(queue().textContent).toContain(article.headline);expect(host.querySelector('a[href^="javascript:"]')).toBeNull();
 await act(async()=>root.render(<PreviewLockerForm key="changed" record={record} initialNewsReview={review} newsReviewCurrent={false} />));
 expect(button("Add to draft",queue()).disabled).toBe(true);expect(queue().textContent).toContain("identity changed");
});

it("opens the existing article editor and saves changes without adding duplicate articles",async()=>{
 const edit={id:"saved-article",sourceUrl:article.article_url,articleUrl:article.article_url,headline:article.headline,publisher:article.publisher,visible:true,imageUrl:null,summary:article.summary,publishedAt:null};
 await act(async()=>root.render(<PreviewLockerForm record={{...record,article_edits:[edit]}} initialNewsReview={review} />));
 expect(queue().querySelector('input[aria-label^="I reviewed this"]')).toBeNull();expect(button("Add selected to draft",queue())).toBeUndefined();
 const input=host.querySelector<HTMLInputElement>('[aria-label="Added article 1 headline"]')!;
 const editor=input.closest('details')!;editor.open=false;
 await click("Edit article",queue());expect(editor.open).toBe(true);expect(document.activeElement).toBe(input);
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'Reviewed career story');input.dispatchEvent(new Event('input',{bubbles:true}));});
 fetcher.mockResolvedValueOnce(Response.json({id:record.id,slug:record.slug,revision:4}));await click("Save draft");
 const payload=JSON.parse(fetcher.mock.calls[0][1].body);expect(payload.content.article_edits).toEqual([{...edit,headline:'Reviewed career story'}]);
});

async function fillIdentity(label: string, value: string) {
 const input=host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}));});
}
it.each(["individual","bulk"])("keeps %s article review usable after removing a duplicate school and saving",async(mode)=>{
 const original={...record,school:"California; College of the Canyons",schools:previewContent.shape.schools.parse([{label:"College of the Canyons",color:"#152238"},{label:"California",color:"#152238"},{label:"California; College of the Canyons",color:"#152238"}])};
 await act(async()=>root.render(<PreviewLockerForm record={original} initialNewsReview={review} />));
 const duplicate=host.querySelector('[aria-label="schools 3 label"]')!.parentElement!;
 await click("Remove from draft",duplicate);
 expect(queue().querySelector<HTMLInputElement>('input[aria-label^="I reviewed this"]')!.disabled).toBe(false);
 expect(queue().textContent).toContain("School, position or team details changed");
 fetcher.mockResolvedValueOnce(Response.json({id:record.id,slug:record.slug,revision:4}));await click("Save draft");
 expect(queue().querySelector<HTMLInputElement>('input[aria-label^="I reviewed this"]')!.disabled).toBe(false);
 if(mode==="bulk") {
  await click("Select all",queue());
  const bulk=queue().querySelector<HTMLElement>('[role="group"]')!;
  expect(bulk.querySelector<HTMLInputElement>('input[type="checkbox"]')!.disabled).toBe(false);
  await act(async()=>bulk.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());await click("Add selected to draft",queue());
 } else {
  await act(async()=>queue().querySelector<HTMLInputElement>('input[aria-label^="I reviewed this"]')!.click());await click("Add to draft",queue());
 }
 expect(host.querySelector<HTMLInputElement>('[aria-label="Added article 1 headline"]')!.value).toBe(article.headline);
 expect(queue().textContent).toContain("0 awaiting review");
 fetcher.mockResolvedValueOnce(Response.json({id:record.id,slug:record.slug,revision:5}));await click("Save draft");
 const saved=JSON.parse(fetcher.mock.calls[1][1].body);
 expect(saved.revision).toBe(4);expect(saved.content.schools.map((s:{label:string})=>s.label)).toEqual(["College of the Canyons","California"]);
 expect(saved.content.article_edits).toHaveLength(1);expect(saved.content.article_edits[0].articleUrl).toBe(article.article_url);
 expect(saved.content.pfr_stats).toEqual(original.pfr_stats);expect(fetcher).toHaveBeenCalledTimes(2);
});
it("requires fresh intent when the athlete name changes and keeps saved-version conflicts locked",async()=>{
 await act(async()=>root.render(<PreviewLockerForm record={record} initialNewsReview={review} />));
 await act(async()=>queue().querySelector<HTMLInputElement>('input[aria-label^="I reviewed this"]')!.click());
 await fillIdentity("Full name","Another Athlete");
 expect(queue().querySelector<HTMLInputElement>('input[aria-label^="I reviewed this"]')!.disabled).toBe(true);
 await fillIdentity("Full name",record.full_name);
 expect(queue().querySelector<HTMLInputElement>('input[aria-label^="I reviewed this"]')!.checked).toBe(false);
 expect(button("Add to draft",queue()).disabled).toBe(true);
 fetcher.mockResolvedValueOnce(Response.json({articles:[],revision:4,review}));await click("Reload saved articles");
 expect(queue().querySelector<HTMLInputElement>('input[aria-label^="I reviewed this"]')!.disabled).toBe(true);
 await fillIdentity("Full name","");
 expect(queue().querySelector<HTMLInputElement>('input[aria-label^="I reviewed this"]')!.disabled).toBe(true);
 await fillIdentity("Full name",record.full_name);
 await fillIdentity("School","Another College");await fillIdentity("School",record.school!);
 expect(queue().querySelector<HTMLInputElement>('input[aria-label^="I reviewed this"]')!.disabled).toBe(true);
 fetcher.mockResolvedValueOnce(Response.json({articles:[],revision:3,review}));await click("Reload saved articles");
 expect(queue().querySelector<HTMLInputElement>('input[aria-label^="I reviewed this"]')!.disabled).toBe(false);
 expect(fetcher.mock.calls.every(call=>call[1]?.method!=="POST")).toBe(true);
});
