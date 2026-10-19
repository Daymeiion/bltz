// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({auth:vi.fn(),rpc:vi.fn(),from:vi.fn(),select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn(),discover:vi.fn(),provider:vi.fn(),identity:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:m.auth},rpc:m.rpc,from:m.from})}));
vi.mock("@/lib/preview-lockers/enrichment",()=>({previewIdentityKey:()=>"identity",previewNewsIdentity:(value:unknown)=>value,withSchoolAliases:m.identity}));
vi.mock("@/lib/enrichment/search-provider",()=>({configuredSearchProvider:m.provider}));
vi.mock("@/lib/enrichment/combine",async original=>({...await original<object>(),discoverCombine:m.discover}));
import { POST } from "@/app/api/preview-lockers/[id]/combine/route";
import { previewContent } from "@/lib/preview-lockers/validation";
const id="00000000-0000-4000-8000-000000000001",params={params:Promise.resolve({id})};
const row={...previewContent.parse({slug:"fixture-player",full_name:"Fixture Player",school:"Arizona"}),id,revision:3,created_at:"",updated_at:""};
const request=(body:unknown={revision:3},origin="http://localhost")=>new Request("http://localhost/api/preview-lockers/id/combine",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)});
beforeEach(()=>{
 vi.resetAllMocks();m.auth.mockResolvedValue({data:{user:{id:"admin"}}});m.rpc.mockImplementation(async(name:string)=>({data:name==="admit_preview_discovery"?"ticket":true}));
 for(const name of ["from","select","eq"] as const)m[name].mockReturnValue(m);
 m.maybeSingle.mockResolvedValue({data:row});m.provider.mockReturnValue({name:"fixture"});
 m.identity.mockResolvedValue({fullName:"Fixture Player",sport:"football",schools:["Arizona"],teams:[]});
 m.discover.mockResolvedValue({suggestions:[],sources:[],status:"complete"});
});
it("requires Admin, same origin and a saved revision before searching",async()=>{
 m.auth.mockResolvedValueOnce({data:{user:null}});expect((await POST(request(),params)).status).toBe(401);
 m.rpc.mockResolvedValueOnce({data:false});expect((await POST(request(),params)).status).toBe(403);
 expect((await POST(request(undefined,"https://other.example.com"),params)).status).toBe(403);
 expect((await POST(request({revision:2}),params)).status).toBe(409);
 expect((await POST(request({revision:3,url:"https://internal.local",fullName:"Other"}),params)).status).toBe(400);
 expect(m.discover).not.toHaveBeenCalled();
});
it("returns suggestions without writing Locker fields and finalizes the search quota",async()=>{
 const response=await POST(request(),params);expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');
 expect(await response.json()).toMatchObject({revision:3,result:{suggestions:[]}});
 expect(m.from.mock.calls.every(([table])=>table==='preview_lockers')).toBe(true);
 expect(m.rpc.mock.calls.map(([name])=>name)).toEqual(['is_internal_admin','admit_preview_discovery','finalize_preview_discovery']);
 expect(m.rpc).toHaveBeenLastCalledWith('finalize_preview_discovery',{p_request_id:'ticket',p_succeeded:true});
});
it("handles unconfigured, incomplete and rate limited searches without modifying measurements",async()=>{
 m.provider.mockReturnValueOnce(null);expect((await POST(request(),params)).status).toBe(503);
 m.identity.mockResolvedValueOnce({fullName:'Fixture Player',sport:'football',schools:[],teams:[]});expect((await POST(request(),params)).status).toBe(400);
 m.rpc.mockImplementation(async(name:string)=>({data:name==='admit_preview_discovery'?null:true}));expect((await POST(request(),params)).status).toBe(429);expect(m.discover).not.toHaveBeenCalled();
});
it("rejects stale results and contains provider failures without exposing details",async()=>{
 m.maybeSingle.mockResolvedValueOnce({data:row}).mockResolvedValueOnce({data:{revision:4}});expect((await POST(request(),params)).status).toBe(409);
 expect(m.rpc).toHaveBeenLastCalledWith('finalize_preview_discovery',{p_request_id:'ticket',p_succeeded:false});
 m.discover.mockRejectedValueOnce(new Error('private upstream error'));const response=await POST(request(),params);expect(response.status).toBe(503);expect(await response.text()).not.toContain('private upstream');
});
