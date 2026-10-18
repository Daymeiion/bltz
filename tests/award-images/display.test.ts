// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({from:vi.fn(),eq:vi.fn(),sign:vi.fn()}));
vi.mock("@/lib/supabase/service",()=>({createServiceClient:()=>({from:mock.from,storage:{from:()=>({createSignedUrls:mock.sign})}})}));
import { publicAwardArtwork } from "@/lib/award-images/server";

const id="00000000-0000-4000-8000-000000000001";
const asset={id,title:"Uploaded trophy",active:true,asset_status:"placeholder",storage_path:"images/trophy.png",image_source_url:null,image_license:null,attribution:null};
const awards=[{label:"Player award",year:"2007",imageMode:"custom" as const,imageAssetId:id}];
beforeEach(()=>{
 vi.resetAllMocks();
 const images={select:()=>images,in:()=>images,eq:mock.eq,then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:[asset]}).then(resolve)};
 mock.eq.mockReturnValue(images);
 mock.from.mockImplementation((table:string)=>table==="award_image_assets"?images:{select:()=>({eq:()=>({limit:async()=>({data:[]})})})});
 mock.sign.mockResolvedValue({data:[{path:asset.storage_path,signedUrl:"https://storage.example.com/signed-trophy.png"}]});
});
it("loads and signs unreviewed selected artwork for demo Lockers without changing the saved award",async()=>{
 const result=await publicAwardArtwork(awards,[],"preview_demo_award");
 expect(result[0]).toMatchObject({imageAssetId:id,imageUrl:"https://storage.example.com/signed-trophy.png"});
 expect(mock.eq).not.toHaveBeenCalledWith("asset_status","approved");
 expect(awards[0]).not.toHaveProperty("imageUrl");
});
it("retains approved-only queries and display rules outside preview demos",async()=>{
 expect((await publicAwardArtwork(awards))[0]).toMatchObject({imageUrl:null});
 expect(mock.eq).toHaveBeenCalledWith("asset_status","approved");
});
