// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readNewsReview } from "@/lib/preview-lockers/news-review-server";
import { previewContent } from "@/lib/preview-lockers/validation";
const content = previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player", school: "Cal" });
const article = { headline: "Fixture Player Cal football career", article_url: "https://press.example.com/story", canonical_url: "https://press.example.com/story", publisher: "Press", source_domain: "press.example.com", author: null, published_at: null, thumbnail_url: null, summary: "Football at Cal", metadata: { extraction: "NewsArticle" }, discovery_source: "fixture", discovered_at: "2020-01-01", confidence: 0.95, relevance_score: 0.95, featured: false, review_keys: [] };
function fixture(data: unknown[] = [article]) {
 const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() }; for(const method of ["select","eq","order"] as const)query[method].mockReturnValue(query);query.limit.mockResolvedValue({data});
 const state = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };state.select.mockReturnValue(state);state.eq.mockReturnValue(state);state.maybeSingle.mockResolvedValue({data:{news_review_version:2,news_searched_at:null,identity_key:"a".repeat(64)}});
 const from = vi.fn((table:string)=>table==="player_articles"?query:table==="preview_enrichments"?state:{select:()=>({limit:async()=>({data:[]})})});
 return {client:{from} as unknown as SupabaseClient,query,state,from};
}
it("loads private pending news by preview and identity independently of revision, without discovery",async()=>{
 const {client,query,from}=fixture();const result=await readNewsReview(client,"preview",content);
 expect(result.articles).toHaveLength(1);expect(result.version).toBe(2);expect(query.eq).toHaveBeenCalledWith("status","review");expect(query.eq).toHaveBeenCalledWith("preview_id","preview");expect(query.eq).toHaveBeenCalledWith("identity_key",expect.stringMatching(/^[a-f0-9]{64}$/));expect(query.eq).not.toHaveBeenCalledWith("source_revision",expect.anything());expect(query.limit).toHaveBeenCalledWith(200);
 expect(from.mock.calls.every(([table])=>["player_articles","preview_enrichments","cfb_teams"].includes(table))).toBe(true);
});
it("applies current player/news gates to previously saved suggestions and fails honestly on storage errors",async()=>{
 const {client,query,state}=fixture([{...article,headline:"Fixture Player Cal basketball career",summary:"Basketball at Cal"},article]);
 expect((await readNewsReview(client,"preview",content)).articles).toHaveLength(1);
 query.limit.mockResolvedValue({error:{code:"unavailable"}});await expect(readNewsReview(client,"preview",content)).rejects.toThrow("news_review_unavailable");
 query.limit.mockResolvedValue({data:[]});state.maybeSingle.mockResolvedValue({error:{code:"unavailable"}});await expect(readNewsReview(client,"preview",content)).rejects.toThrow("news_review_unavailable");
});
