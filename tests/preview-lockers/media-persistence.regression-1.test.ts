// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(), storageFrom: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, rpc: mocks.rpc, from: mocks.from, storage: { from: mocks.storageFrom } }) }));
import { PATCH } from "@/app/api/preview-lockers/[id]/route";
import { previewContent } from "@/lib/preview-lockers/validation";

const id = "00000000-0000-4000-8000-000000000001";
const path = `${id}/photos/00000000-0000-4000-8000-000000000002.jpg`;
const content = previewContent.parse({ slug: "fixture-player", full_name: "Fixture Player", photos: [{ id: "photo-1", title: "Uploaded photo", storagePath: path, mimeType: "image/jpeg", credits: null, sourceUrl: null, level: "cfb", season: null }] });
const request = (payload = content) => new Request(`http://localhost/api/preview-lockers/${id}`, { method: "PATCH", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ revision: 1, content: payload }) });
beforeEach(() => {
  vi.resetAllMocks(); mocks.auth.mockResolvedValue({ data: { user: { id: "admin" } }, error: null }); mocks.rpc.mockResolvedValue({ data: true, error: null });
  for (const key of ["from", "update", "eq", "select"] as const) mocks[key].mockReturnValue(mocks);
  mocks.storageFrom.mockReturnValue({ list: mocks.list });
});

// Regression: a syntactically valid but missing object path could otherwise make every preview read fail closed.
it("refuses to persist a storage locator until the private object exists", async () => {
  mocks.list.mockResolvedValue({ data: [], error: null });
  const response = await PATCH(request(), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(400); expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.storageFrom).toHaveBeenCalledWith("preview-locker-photos"); expect(mocks.list).toHaveBeenCalledWith(`${id}/photos`, { limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } });
});
it.each(["merchandise","article_edits"] as const)("checks %s upload ownership and existence before saving",async field=>{
 const item=field==="merchandise"?{id:"card",title:"Football card",category:"trading_card",productUrl:"https://shop.example.com/card",imageUrl:"https://shop.example.com/default.png",imageStoragePath:path}:{id:"article",headline:"Fixture Player career",publisher:"Sports Press",articleUrl:"https://publisher.example.com/career",imageUrl:"https://publisher.example.com/default.png",imageStoragePath:path};
 const payload=previewContent.parse({...content,photos:[],[field]:[item]});
 mocks.list.mockResolvedValue({data:[],error:null});
 expect((await PATCH(request(payload),{params:Promise.resolve({id})})).status).toBe(400);
 expect(mocks.update).not.toHaveBeenCalled();
 const foreign=previewContent.parse({...payload,[field]:[{...item,imageStoragePath:path.replace(id,"00000000-0000-4000-8000-000000000009")}]});
 mocks.list.mockClear();
 expect((await PATCH(request(foreign),{params:Promise.resolve({id})})).status).toBe(400); expect(mocks.list).not.toHaveBeenCalled();
 mocks.list.mockResolvedValue({data:[{name:path.split('/').at(-1)}],error:null});
 mocks.maybeSingle.mockResolvedValueOnce({data:{id,slug:payload.slug,revision:2},error:null}).mockResolvedValueOnce({data:null,error:null});
 expect((await PATCH(request(payload),{params:Promise.resolve({id})})).status).toBe(200);
 expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({[field]:payload[field]}));
});

it("persists an owned existing object through the revision guard", async () => {
  mocks.list.mockResolvedValue({ data: [{ name: "00000000-0000-4000-8000-000000000002.jpg" }], error: null });
  mocks.maybeSingle.mockResolvedValueOnce({ data: { id, slug: content.slug, revision: 2 }, error: null }).mockResolvedValueOnce({ data: null, error: null });
  const response = await PATCH(request(), { params: Promise.resolve({ id }) });
  expect(response.status).toBe(200); expect(mocks.eq).toHaveBeenCalledWith("revision", 1);
});

it("rejects foreign or missing school logo uploads and saves an owned existing logo separately from its default",async()=>{
 const school={label:"Fixture Community College",color:"#152238",logo:"https://college.example.com/default.png",logoStoragePath:path};
 const payload=previewContent.parse({...content,photos:[],schools:[school]});
 const foreign=previewContent.parse({...payload,schools:[{...school,logoStoragePath:path.replace(id,"00000000-0000-4000-8000-000000000099")}]});
 expect((await PATCH(request(foreign),{params:Promise.resolve({id})})).status).toBe(400);expect(mocks.storageFrom).not.toHaveBeenCalled();
 mocks.list.mockResolvedValueOnce({data:[],error:null});expect((await PATCH(request(payload),{params:Promise.resolve({id})})).status).toBe(400);expect(mocks.update).not.toHaveBeenCalled();
 mocks.list.mockResolvedValue({data:[{name:path.split('/').at(-1)}],error:null});
 mocks.maybeSingle.mockResolvedValueOnce({data:{id,slug:payload.slug,revision:2},error:null}).mockResolvedValueOnce({data:null,error:null});
 expect((await PATCH(request(payload),{params:Promise.resolve({id})})).status).toBe(200);expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({schools:[school]}));
});

it("verifies many draft items with one bounded folder listing per media kind", async () => {
  const secondPath = `${id}/photos/00000000-0000-4000-8000-000000000003.jpg`;
  const multiple = previewContent.parse({ ...content, photos: [...content.photos, { id: "photo-2", title: "Second", storagePath: secondPath, mimeType: "image/jpeg", credits: null, sourceUrl: null, level: "cfb", season: null }] });
  mocks.list.mockResolvedValue({ data: [{ name: path.split("/").at(-1) }, { name: secondPath.split("/").at(-1) }], error: null });
  mocks.maybeSingle.mockResolvedValueOnce({ data: { id, slug: content.slug, revision: 2 }, error: null }).mockResolvedValueOnce({ data: null, error: null });
  expect((await PATCH(request(multiple), { params: Promise.resolve({ id }) })).status).toBe(200);
  expect(mocks.list).toHaveBeenCalledTimes(1);
});

it("continues past an orphan-saturated first page to find referenced objects", async () => {
  const firstPage = Array.from({ length: 100 }, (_, index) => ({ name: `orphan-${String(index).padStart(3, "0")}.jpg` }));
  mocks.list.mockResolvedValueOnce({ data: firstPage, error: null }).mockResolvedValueOnce({ data: [{ name: path.split("/").at(-1) }], error: null });
  mocks.maybeSingle.mockResolvedValueOnce({ data: { id, slug: content.slug, revision: 2 }, error: null }).mockResolvedValueOnce({ data: null, error: null });
  expect((await PATCH(request(), { params: Promise.resolve({ id }) })).status).toBe(200);
  expect(mocks.list).toHaveBeenNthCalledWith(2, `${id}/photos`, { limit: 100, offset: 100, sortBy: { column: "name", order: "asc" } });
});
