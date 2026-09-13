// @vitest-environment node
import {beforeEach,afterEach,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({auth:vi.fn(),rpc:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:mocks.auth},rpc:mocks.rpc})}));
import {POST} from "@/app/api/preview-conversion/route";
const id="00000000-0000-4000-8000-000000000001";
const body={preview_id:id,request_id:id,session_id:id,action:"view",data:{}};
const req=(data:unknown=body,headers:Record<string,string>={})=>new Request("http://localhost/api/preview-conversion",{method:"POST",headers:{origin:"http://localhost","content-type":"application/json",...headers},body:JSON.stringify(data)});
beforeEach(()=>{vi.stubEnv("PREVIEW_CONVERSION_ENABLED","true");vi.resetAllMocks();mocks.auth.mockResolvedValue({data:{user:{id}},error:null});mocks.rpc.mockImplementation(async(name:string)=>({data:name==="is_internal_admin"?false:{saved:true},error:null}));});
afterEach(()=>vi.unstubAllEnvs());
it("denies anonymous requests and bounds origin and size",async()=>{
  mocks.auth.mockResolvedValue({data:{user:null},error:null});expect((await POST(req())).status).toBe(401);
  expect((await POST(req(body,{origin:"https://attacker.test"}))).status).toBe(403);
  expect((await POST(req({junk:"x".repeat(5000)}))).status).toBe(413);
});
it("excludes admin, prefetch and known crawler traffic before ingestion",async()=>{
  mocks.rpc.mockResolvedValue({data:true,error:null});expect(await (await POST(req())).json()).toEqual({excluded:true});
  mocks.rpc.mockImplementation(async()=>({data:false,error:null}));
  expect(await (await POST(req(body,{purpose:"prefetch"}))).json()).toEqual({excluded:true});
  expect(await (await POST(req(body,{"user-agent":"ExampleBot"}))).json()).toEqual({excluded:true});
  expect(mocks.rpc.mock.calls.every(c=>c[0]==="is_internal_admin")).toBe(true);
});
it("preserves request IDs, relies on DB viewer authorization and returns honest failure",async()=>{
  expect((await POST(req())).status).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledWith("preview_conversion",{p_preview:id,p_action:"view",p_request:id,p_session:id,p_data:{}});
  mocks.rpc.mockImplementation(async(name:string)=>name==="is_internal_admin"?{data:false,error:null}:{data:null,error:{code:"42501"}});
  expect((await POST(req())).status).toBe(403);
});
it("denies manual admin event forgery and stays disabled until rollout",async()=>{
  expect((await POST(req({...body,action:"booking_confirmed"}))).status).toBe(400);
  vi.stubEnv("PREVIEW_CONVERSION_ENABLED","false");expect((await POST(req())).status).toBe(404);
});
