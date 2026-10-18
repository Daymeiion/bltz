// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const mock=vi.hoisted(()=>({auth:vi.fn(),rpc:vi.fn(),from:vi.fn(),select:vi.fn(),eq:vi.fn(),is:vi.fn(),update:vi.fn(),maybeSingle:vi.fn(),storage:vi.fn(),createSignedUploadUrl:vi.fn(),download:vi.fn(),upload:vi.fn(),insert:vi.fn(),single:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:mock.auth},rpc:mock.rpc,from:mock.from,storage:{from:mock.storage}})}));
import { POST,PATCH } from "@/app/api/admin/award-images/uploads/route";
const bytes=readFileSync("public/images/Awards/Award-StarIcon.png"),sha256=createHash("sha256").update(bytes).digest("hex");
const claim={sha256,mime:"image/png",size:bytes.length};
const request=(body:unknown,origin="https://bltz.vercel.app")=>new Request("https://bltz.vercel.app/api/admin/award-images/uploads",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)});
beforeEach(()=>{vi.resetAllMocks();mock.auth.mockResolvedValue({data:{user:{id:"admin"}}});mock.rpc.mockResolvedValue({data:true});for(const name of ["from","select","eq","storage","insert","update"] as const)mock[name].mockReturnValue(mock);mock.is.mockResolvedValue({error:null});mock.maybeSingle.mockResolvedValue({data:null});mock.createSignedUploadUrl.mockResolvedValue({data:{token:"ticket"}});mock.download.mockResolvedValue({data:new Blob([bytes])});mock.upload.mockResolvedValue({error:{message:"The resource already exists"}});mock.single.mockResolvedValue({data:{id:"saved"}});});
it("authorizes every stage before issuing a ticket or downloading bytes",async()=>{
 mock.auth.mockResolvedValue({data:{user:null}});expect((await POST(request(claim))).status).toBe(401);
 mock.auth.mockResolvedValue({data:{user:{id:"viewer"}}});mock.rpc.mockResolvedValue({data:false});expect((await PATCH(request(claim))).status).toBe(403);expect(mock.storage).not.toHaveBeenCalled();
});
it("rejects cross-site, invalid type and oversize claims",async()=>{
 expect((await POST(request(claim,"https://evil.example.com"))).status).toBe(403);
 expect((await POST(request({...claim,mime:"image/svg+xml"}))).status).toBe(400);
 expect((await POST(request({...claim,size:10485761}))).status).toBe(400);expect(mock.createSignedUploadUrl).not.toHaveBeenCalled();
});
it("uses immutable SHA paths, skips saved duplicates, and finalizes validated uploaded bytes",async()=>{
 expect(await (await POST(request(claim))).json()).toMatchObject({path:`images/${sha256}.png`,token:"ticket",bucket:"award-library"});
 mock.maybeSingle.mockResolvedValueOnce({data:{id:"existing"}});
 expect(await (await POST(request(claim))).json()).toEqual({id:"existing",duplicate:true});
 const details={title:"Star trophy",image_source_url:null,image_license:null,attribution:null,asset_status:"placeholder",active:true};
 expect((await PATCH(request({...claim,original_filename:"Award-StarIcon.png",details}))).status).toBe(201);
 expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({sha256,title:"Star trophy",asset_status:"placeholder",original_filename:"Award-StarIcon.png"}));
 expect((await PATCH(request({...claim,sha256:"0".repeat(64),details}))).status).toBe(400);
 mock.download.mockResolvedValue({data:new Blob([new Uint8Array([137,80,78,71,13,10,26,10])])});
 expect((await PATCH(request({...claim,details}))).status).toBe(400);
});

it("records a duplicate file's first known basename without replacing existing filenames",async()=>{
 mock.maybeSingle.mockResolvedValue({data:{id:"existing"}});
 expect((await POST(request({...claim,original_filename:"Award-StarIcon.png"}))).status).toBe(200);
 expect(mock.update).toHaveBeenCalledWith({original_filename:"Award-StarIcon.png"});expect(mock.is).toHaveBeenCalledWith("original_filename",null);
 expect((await POST(request({...claim,original_filename:"folder/image.png"}))).status).toBe(400);
});
it("restores a missing canonical object from verified duplicate bytes without another image record",async()=>{
 mock.maybeSingle.mockResolvedValue({data:{id:"existing",storage_path:`images/${sha256}.png`}});
 mock.upload.mockResolvedValue({error:null});
 const details={title:"Star trophy",image_source_url:null,image_license:null,attribution:null,asset_status:"placeholder",active:true};
 expect(await(await PATCH(request({...claim,details}))).json()).toEqual({id:"existing",duplicate:true});
 expect(mock.upload).toHaveBeenCalledWith(`images/${sha256}.png`,expect.any(Uint8Array),expect.objectContaining({upsert:false}));
 expect(mock.insert).not.toHaveBeenCalled();
});
