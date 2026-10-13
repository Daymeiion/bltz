// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({auth:vi.fn(),role:vi.fn(),from:vi.fn(),status:vi.fn(),sign:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:mocks.auth},rpc:mocks.role})}));
vi.mock("@/lib/supabase/service",()=>({createServiceClient:()=>({from:mocks.from,rpc:mocks.status,storage:{from:()=>({createSignedUrls:mocks.sign})}})}));
import { GET } from "@/app/api/preview-lockers/[id]/photos/route";
const previewId="00000000-0000-4000-8000-000000000010";
const path=previewId+"/photos/00000000-0000-4000-8000-000000000080.jpg";
const context={params:Promise.resolve({id:"synthetic-window"})};
const request=new Request("https://bltz.me/api/preview-lockers/synthetic-window/photos?offset=0");
beforeEach(()=>{
  vi.resetAllMocks();mocks.auth.mockResolvedValue({data:{user:null}});mocks.role.mockResolvedValue({data:false,error:null});
  mocks.from.mockReturnValue({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:previewId,photos:[{id:"photo",title:"Private Photo",storagePath:path}]},error:null})})})});
  mocks.status.mockResolvedValue({data:{state:"active",remaining_seconds:11},error:null});
  mocks.sign.mockResolvedValue({data:[{path,signedUrl:"https://storage.example/signed",error:null}],error:null});
});
it("caps paginated uploaded-photo signing at a fresh remaining deadline and forbids caching",async()=>{
  mocks.status.mockResolvedValueOnce({data:{state:"active",remaining_seconds:11},error:null}).mockResolvedValueOnce({data:{state:"active",remaining_seconds:7},error:null});
  const response=await GET(request,context);
  expect(response.status).toBe(200);expect(mocks.sign).toHaveBeenCalledWith([path],7);
  expect(mocks.status).toHaveBeenCalledTimes(2);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect((await response.json()).photos[0].url).toBe("https://storage.example/signed");
});
it.each(["pending","expired","unavailable"])("denies %s pagination before signing",async state=>{
  mocks.status.mockResolvedValue({data:{state,remaining_seconds:0},error:null});
  const response=await GET(request,context);expect(response.status).toBe(404);expect(mocks.sign).not.toHaveBeenCalled();
  expect(await response.json()).toEqual({error:"not_found"});
});
it("rechecks and denies a window that expires between authorization and signing",async()=>{
  mocks.status.mockResolvedValueOnce({data:{state:"active",remaining_seconds:1},error:null}).mockResolvedValueOnce({data:{state:"expired",remaining_seconds:0},error:null});
  expect((await GET(request,context)).status).toBe(404);expect(mocks.sign).not.toHaveBeenCalled();
});
it("retains Admin inspection while public access is unavailable",async()=>{
  mocks.auth.mockResolvedValue({data:{user:{id:"admin"}}});mocks.role.mockResolvedValue({data:true,error:null});
  mocks.status.mockResolvedValue({data:{state:"unavailable",remaining_seconds:0},error:null});
  expect((await GET(request,context)).status).toBe(200);expect(mocks.sign).toHaveBeenCalledWith([path],900);
  expect(mocks.status).not.toHaveBeenCalled();
});
