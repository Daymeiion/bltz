// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({auth:vi.fn(),rpc:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:mock.auth},rpc:mock.rpc})}));
import { POST } from "@/app/api/admin/award-images/matches/route";
const row={award_id:"00000000-0000-4000-8000-000000000001",image_asset_id:"00000000-0000-4000-8000-000000000002",award_updated_at:"2026-10-17T12:00:00.123456+00:00",image_revision:4};
const request=(body:unknown,origin="https://bltz.vercel.app")=>new Request("https://bltz.vercel.app/api/admin/award-images/matches",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)});
beforeEach(()=>{vi.resetAllMocks();mock.auth.mockResolvedValue({data:{user:{id:"admin"}}});mock.rpc.mockImplementation(async(name:string)=>name==="is_internal_admin"?{data:true}:{data:{saved:2,unchanged:0}});});
it("checks authentication, Admin capability and origin before approving",async()=>{
 mock.auth.mockResolvedValue({data:{user:null}});expect((await POST(request({matches:[row]}))).status).toBe(401);
 mock.auth.mockResolvedValue({data:{user:{id:"viewer"}}});mock.rpc.mockResolvedValue({data:false});expect((await POST(request({matches:[row]}))).status).toBe(403);
 mock.rpc.mockResolvedValue({data:true});expect((await POST(request({matches:[row]},"https://evil.example.com"))).status).toBe(403);
 expect(mock.rpc.mock.calls.some(([name])=>name==="approve_award_image_matches")).toBe(false);
});
it("sends the reviewed revisions to one atomic database call and reports stale batches",async()=>{
 const other={...row,award_id:"00000000-0000-4000-8000-000000000003"};
 expect(await(await POST(request({matches:[row,other]}))).json()).toEqual({saved:2,unchanged:0});
 expect(mock.rpc).toHaveBeenCalledWith("approve_award_image_matches",{p_matches:[row,other]});
 mock.rpc.mockImplementation(async(name:string)=>name==="is_internal_admin"?{data:true}:{error:{code:"PT409"}});
 expect((await POST(request({matches:[row]}))).status).toBe(409);
});
it("rejects duplicate targets, empty and oversized input without mutation",async()=>{
 for(const matches of [[],[row,row],Array(101).fill(row)])expect((await POST(request({matches}))).status).toBe(400);
 expect((await POST(request({matches:[row],padding:"x".repeat(65536)}))).status).toBe(413);
 expect(mock.rpc.mock.calls.some(([name])=>name==="approve_award_image_matches")).toBe(false);
});
