// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), insert: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(), maybeSingle: vi.fn(), storageFrom: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mock.auth }, rpc: mock.rpc, from: mock.from, storage:{from:mock.storageFrom} }) }));
import { POST } from "@/app/api/preview-lockers/route";
import { PATCH } from "@/app/api/preview-lockers/[id]/route";
import { previewContent } from "@/lib/preview-lockers/validation";
const id = "00000000-0000-4000-8000-000000000001"; const content = previewContent.parse({ slug: "synthetic-preview", full_name: "Synthetic Preview" });
const request = (body: unknown, method = "POST") => new Request("http://localhost/api/preview-lockers", { method, headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); mock.storageFrom.mockReturnValue({list:mock.list}); mock.list.mockResolvedValue({data:[{name:"00000000-0000-4000-8000-000000000002.png"}],error:null}); mock.auth.mockResolvedValue({ data: { user: { id: "admin" } } }); mock.rpc.mockResolvedValue({ data: true }); for (const key of ["from","insert","update","eq","select"] as const) mock[key].mockReturnValue(mock); });
it("denies unauthenticated and non-admin mutations before table access", async () => {
  mock.auth.mockResolvedValue({ data: { user: null } }); expect((await POST(request({id,content}))).status).toBe(401);
  mock.auth.mockResolvedValue({ data: { user: { id: "ordinary" } } }); mock.rpc.mockResolvedValue({ data: false }); expect((await PATCH(request({revision:1,content},"PATCH"),{params:Promise.resolve({id})})).status).toBe(403); expect(mock.from).not.toHaveBeenCalled();
});
it("rejects unknown nested input and never reports false persistence", async () => {
  expect((await POST(request({id,content:{...content,raw_sources:{}}}))).status).toBe(400); expect(mock.from).not.toHaveBeenCalled(); mock.single.mockResolvedValue({error:{code:"23514",message:"private database error"}}); const response = await POST(request({id,content})); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private database error");
});
it("returns unchanged idempotent create and rejects later-version retries", async () => {
  mock.single.mockResolvedValue({error:{code:"23505"}}); mock.maybeSingle.mockResolvedValue({data:{...content,id,revision:1,created_at:"",updated_at:""}}); expect((await POST(request({id,content}))).status).toBe(200);
  mock.maybeSingle.mockResolvedValue({data:{...content,id,revision:2,created_at:"",updated_at:""}}); expect((await POST(request({id,content}))).status).toBe(409);
});
it("uses revision compare-and-set and returns conflict rather than overwriting", async () => {
  mock.maybeSingle.mockResolvedValue({data:null,error:null}); expect((await PATCH(request({revision:7,content},"PATCH"),{params:Promise.resolve({id})})).status).toBe(409); expect(mock.eq).toHaveBeenCalledWith("revision",7);
});
it("distinguishes a duplicate Locker URL from an out-of-date editor", async () => {
  mock.maybeSingle.mockResolvedValueOnce({ data: null, error: { code: "23505" } });
  const duplicate = await PATCH(request({ revision: 7, content }, "PATCH"), { params: Promise.resolve({ id }) });
  expect(duplicate.status).toBe(409);
  expect(await duplicate.json()).toMatchObject({ error: "slug_conflict" });
  mock.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
  const stale = await PATCH(request({ revision: 7, content }, "PATCH"), { params: Promise.resolve({ id }) });
  expect(stale.status).toBe(409);
  expect(await stale.json()).toMatchObject({ error: "preview_conflict" });
});
it("preserves biography fields omitted by older editors and persists explicit edits or clears", async () => {
  const {dob:_dob,high_school:_highSchool,...legacy}=content;
  mock.maybeSingle.mockResolvedValue({data:{id,slug:content.slug,revision:2},error:null});
  expect((await PATCH(request({revision:1,content:legacy},"PATCH"),{params:Promise.resolve({id})})).status).toBe(200);
  expect(mock.update.mock.calls[0][0]).not.toHaveProperty("dob");
  expect(mock.update.mock.calls[0][0]).not.toHaveProperty("high_school");
  expect((await PATCH(request({revision:2,content:{...content,dob:"1986-07-09",high_school:"Los Alamitos High School"}},"PATCH"),{params:Promise.resolve({id})})).status).toBe(200);
  expect(mock.update.mock.calls[1][0]).toMatchObject({dob:"1986-07-09",high_school:"Los Alamitos High School"});
  expect((await PATCH(request({revision:3,content},"PATCH"),{params:Promise.resolve({id})})).status).toBe(200);
  expect(mock.update.mock.calls[2][0]).toMatchObject({dob:null,high_school:null});
});
it("reports a committed save even when the postwrite completion read fails", async () => {
  mock.maybeSingle
    .mockResolvedValueOnce({ data: { id, slug: content.slug, revision: 8 }, error: null })
    .mockResolvedValueOnce({ data: null, error: { code: "08006" } });
  const response = await PATCH(request({ revision: 7, content }, "PATCH"), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id, slug: content.slug, revision: 8, complete: false, completionStatus: "unavailable" });
});
it("never writes schema defaults over fields omitted by an older or partial editor", async () => {
  mock.maybeSingle.mockResolvedValue({data:{id,slug:content.slug,revision:2},error:null});
  const response = await PATCH(request({revision:1,content:{slug:content.slug,full_name:content.full_name,bio:"New biography"}},"PATCH"),{params:Promise.resolve({id})});
  expect(response.status).toBe(200);
  expect(mock.update.mock.calls[0][0]).toEqual({slug:content.slug,full_name:content.full_name,bio:"New biography"});
});
it("persists sourced Combine results through revision-protected saves and permits explicit clearing", async () => {
  const combine_results=[{id:"combine-2008",eventType:"combine",year:2008,timing:"official",sourceUrl:"https://league.example.com/fixture",measurements:[{metric:"forty",value:4.55,sourceUrl:null}]}];
  mock.maybeSingle.mockResolvedValue({data:{id,slug:content.slug,revision:2},error:null});
  expect((await PATCH(request({revision:1,content:{...content,combine_results}},"PATCH"),{params:Promise.resolve({id})})).status).toBe(200);
  expect(mock.update.mock.calls[0][0]).toMatchObject({combine_results});
  expect((await PATCH(request({revision:2,content:{...content,combine_results:[]}},"PATCH"),{params:Promise.resolve({id})})).status).toBe(200);
  expect(mock.update.mock.calls[1][0]).toMatchObject({combine_results:[]});
});
const nfl = [{ category: "defense", sourceUrl: "https://www.pro-football-reference.com/players/F/FixtPl00.htm", importedAt: "2026-10-11T00:00:00.000Z", seasons: [{ year: 2024, team: "AAA", gamesPlayed: 17, gamesStarted: null, statistics: { sacks: 2.5 } }], careerTotals: { seasonCount: 1, gamesPlayed: 17, gamesStarted: null, statistics: { sacks: 2.5, passesDefended: 4 } } }];
it("passes validated NFL tables through admin create and revision-protected update", async () => {
  const imported = { ...content, pfr_stats: nfl };
  mock.single.mockResolvedValue({ data: { ...imported, id, revision: 1 }, error: null });
  expect((await POST(request({ id, content: imported }))).status).toBe(201);
  expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({ id, pfr_stats: nfl }));
  mock.maybeSingle.mockResolvedValue({ data: { id, slug: content.slug, revision: 2 }, error: null });
  expect((await PATCH(request({ revision: 1, content: imported }, "PATCH"), { params: Promise.resolve({ id }) })).status).toBe(200);
  expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({ pfr_stats: nfl }));
  expect(mock.eq).toHaveBeenCalledWith("revision", 1);
});
it("rejects unrelated NFL source pages and unauthorized CSV writes before persistence", async () => {
  const invalid = [{ ...nfl[0], sourceUrl: "https://www.pro-football-reference.com/years/2024/" }];
  expect((await POST(request({ id, content: { ...content, pfr_stats: invalid } }))).status).toBe(400);
  expect(mock.from).not.toHaveBeenCalled();
  mock.rpc.mockResolvedValue({ data: false });
  expect((await PATCH(request({ revision: 1, content: { ...content, pfr_stats: nfl } }, "PATCH"), { params: Promise.resolve({ id }) })).status).toBe(403);
  expect(mock.from).not.toHaveBeenCalled();
});
it("rejects conflicting or unsupported career totals before database access", async () => {
  for (const statistics of [{ sacks: 3.5 }, { inventedStat: 5 }]) {
    const invalid = [{ ...nfl[0], careerTotals: { ...nfl[0].careerTotals, statistics } }];
    expect((await POST(request({ id, content: { ...content, pfr_stats: invalid } }))).status).toBe(400);
    expect(mock.from).not.toHaveBeenCalled();
  }
});

it("persists separate Story edits and preserves Story omitted by an older editor",async()=>{
 mock.maybeSingle.mockResolvedValue({data:{id,slug:content.slug,revision:2},error:null});
 const {story:_story,...legacy}=content;
 expect((await PATCH(request({revision:1,content:legacy},"PATCH"),{params:Promise.resolve({id})})).status).toBe(200);
 expect(mock.update.mock.calls[0][0]).not.toHaveProperty("story");
 expect((await PATCH(request({revision:2,content:{...content,bio:"Short bio",story:"Detailed life story"}},"PATCH"),{params:Promise.resolve({id})})).status).toBe(200);
 expect(mock.update.mock.calls[1][0]).toMatchObject({bio:"Short bio",story:"Detailed life story"});
 expect((await PATCH(request({revision:3,content:{...content,story:""}},"PATCH"),{params:Promise.resolve({id})})).status).toBe(200);
 expect(mock.update.mock.calls[2][0]).toHaveProperty("story","");
});
it("accepts a full-length Unicode Story alongside existing media within the bounded save payload",async()=>{
 const full=previewContent.parse({...content,story:"界".repeat(20000),photos:Array.from({length:40},(_,i)=>({id:`photo-${i}`,title:`Photo ${i}`,url:`https://image.example.com/${"a".repeat(1800)}${i}.jpg`,level:"cfb"}))});
 expect(new TextEncoder().encode(JSON.stringify({id,content:full})).length).toBeGreaterThan(128*1024);
 mock.single.mockResolvedValue({data:{id,slug:content.slug,revision:1},error:null});
 expect((await POST(request({id,content:full}))).status).toBe(201);
 expect(mock.insert.mock.calls[0][0]).toHaveProperty("story",full.story);
});

it("preserves omitted headshot fields for old editors and saves independent explicit headshot changes",async()=>{
 mock.maybeSingle.mockResolvedValue({data:{id,slug:content.slug,revision:2},error:null});
 const {headshot_storage_path:_hero,bio_headshot_url:_bio,bio_headshot_storage_path:_path,...legacy}=content;void _hero;void _bio;void _path;
 expect((await PATCH(request({revision:1,content:legacy},"PATCH"),{params:Promise.resolve({id})})).status).toBe(200);
 expect(mock.update.mock.calls[0][0]).not.toHaveProperty("headshot_storage_path");expect(mock.update.mock.calls[0][0]).not.toHaveProperty("bio_headshot_url");expect(mock.update.mock.calls[0][0]).not.toHaveProperty("bio_headshot_storage_path");
 const path=`${id}/photos/00000000-0000-4000-8000-000000000002.png`;
 expect((await PATCH(request({revision:2,content:{...content,headshot_storage_path:path,bio_headshot_url:"https://images.example.com/bio.png"}},"PATCH"),{params:Promise.resolve({id})})).status).toBe(200);
 expect(mock.update.mock.calls[1][0]).toMatchObject({headshot_storage_path:path,bio_headshot_url:"https://images.example.com/bio.png"});
 expect((await PATCH(request({revision:3,content:{...content,headshot_storage_path:path,bio_headshot_url:null,bio_headshot_storage_path:null}},"PATCH"),{params:Promise.resolve({id})})).status).toBe(200);
 expect(mock.update.mock.calls[2][0]).toMatchObject({headshot_storage_path:path,bio_headshot_url:null,bio_headshot_storage_path:null});
});
