// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({auth:vi.fn(),rpc:vi.fn(),from:vi.fn(),list:vi.fn(),download:vi.fn(),store:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:mock.auth},rpc:mock.rpc,storage:{from:mock.from}})}));
vi.mock("@/lib/award-images/server",async original=>({...await original<typeof import("@/lib/award-images/server")>(),storeAwardBytes:mock.store}));
import { GET,POST } from "@/app/api/admin/award-images/bucket-imports/route";
const file={id:"source",name:"bednarik-award.png",metadata:{size:20}};
const request=(filename:string)=>new Request("https://bltz.vercel.app/api/admin/award-images/bucket-imports",{method:"POST",headers:{origin:"https://bltz.vercel.app","content-type":"application/json"},body:JSON.stringify({filename})});
beforeEach(()=>{vi.resetAllMocks();mock.auth.mockResolvedValue({data:{user:{id:"admin"}}});mock.rpc.mockResolvedValue({data:true});mock.from.mockReturnValue(mock);mock.list.mockResolvedValue({data:[file]});mock.download.mockResolvedValue({data:new Blob([new Uint8Array(20)])});mock.store.mockResolvedValue(Response.json({id:"saved"},{status:201}));});
it("lists named originals but excludes canonical copies, folders and oversized files",async()=>{
 mock.list.mockResolvedValue({data:[file,{...file,name:"a".repeat(64)+".png"},{...file,id:null,name:"folder"},{...file,name:"big.png",metadata:{size:10485761}}]});
 expect(await(await GET()).json()).toEqual({files:[{filename:file.name,size:20}]});
});
it("imports actual private-bucket bytes through the existing validator and retains the source basename",async()=>{
 expect((await POST(request(file.name))).status).toBe(201);
 expect(mock.download).toHaveBeenCalledWith("images/bednarik-award.png");
 expect(mock.store).toHaveBeenCalledWith(expect.anything(),expect.any(Uint8Array),"bednarik award",{original_filename:"bednarik-award.png"});
 for(const name of ["../private.png","folder/image.png","%2fprivate.png","not-image.svg","a".repeat(64)+".png"])expect((await POST(request(name))).status).toBe(400);
});
it("authorizes both listing and importing before accessing storage",async()=>{
 mock.auth.mockResolvedValue({data:{user:null}});expect((await GET()).status).toBe(401);
 mock.auth.mockResolvedValue({data:{user:{id:"viewer"}}});mock.rpc.mockResolvedValue({data:false});expect((await POST(request(file.name))).status).toBe(403);
 expect(mock.list).not.toHaveBeenCalled();expect(mock.store).not.toHaveBeenCalled();
});
