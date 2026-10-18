// @vitest-environment node
import { expect, it } from "vitest";
import { awardArtwork, imageDetails, imageType, type AwardImage, type AwardImageLibrary } from "@/lib/award-images/model";
import { normalizeAward } from "@/lib/enrichment/awards";
import { previewContent } from "@/lib/preview-lockers/validation";
const id = "00000000-0000-4000-8000-000000000001";
const image = {id, title:"Trophy", active:true, asset_status:"approved", imageUrl:"https://cdn.example.com/trophy.png", image_source_url:"https://bltz.vercel.app/awards", image_license:"Authorized reference artwork", attribution:"BLTZ"} as AwardImage;
const catalog = [{ id:"00000000-0000-4000-8000-000000000002",name:"Thorpe Award",slug:"thorpe-award",aliases:["Jim Thorpe Award"],active:true,image_asset_id:id }] as AwardImageLibrary["catalog"];
const library = {images:[image],catalog};
it("matches exact normalized aliases without claiming a verified achievement",()=>{
 expect(normalizeAward({label:"Jim Thorpe Award (2007)",year:""},catalog)).toMatchObject({award_id:catalog[0].id,year:"2007",verified:false});
 expect(awardArtwork({label:"Jim Thorpe Award",year:"2007"},library).imageUrl).toBe(image.imageUrl);
 const ambiguous=[...catalog,{...catalog[0],id:"other"}];
 expect(normalizeAward({label:"Jim Thorpe Award",year:"2007"},ambiguous).award_id).toBeNull();
 expect(normalizeAward({label:"Jim Thorpe Award",year:"2007",catalogAwardId:catalog[0].id},ambiguous).award_id).toBe(catalog[0].id);
 expect(normalizeAward({label:"Jim Thorpe Award",year:"2007",catalogAwardId:null},catalog).award_id).toBeNull();
});
it("keeps photo/URL overrides across catalog refresh and supports default, custom and no-image choices",()=>{
 const award={label:"Thorpe Award",year:"2007",photoId:"existing-photo",imageUrl:"https://cdn.example.com/custom.png"};
 expect(awardArtwork(award,library)).toMatchObject({photoId:"existing-photo",imageUrl:award.imageUrl});
 expect(awardArtwork({...award,imageMode:"auto"},library)).toMatchObject({photoId:null,imageUrl:image.imageUrl});
 expect(awardArtwork({...award,imageMode:"none"},library)).toMatchObject({photoId:null,imageUrl:null});
 expect(awardArtwork({...award,imageMode:"custom",imageAssetId:id},library)).toMatchObject({photoId:null,imageUrl:image.imageUrl});
});
it.each([{active:false},{asset_status:"placeholder"},{image_license:null},{image_source_url:null},{attribution:null}])("withholds ineligible shared artwork: %j",patch=>{
 expect(awardArtwork({label:"Thorpe Award",year:"2007"},{catalog,images:[{...image,...patch} as AwardImage]}).imageUrl).toBeNull();
});
it("persists reviewed image choices and rejects invalid metadata and bytes",()=>{
 const awards=[{label:"Thorpe Award",year:"2007",catalogAwardId:catalog[0].id,imageMode:"custom",imageAssetId:id}];
 expect(previewContent.parse({slug:"fixture-player",full_name:"Fixture Player",awards}).awards).toEqual(awards);
 expect(imageDetails.safeParse({title:"Trophy",image_source_url:null,image_license:null,attribution:null,asset_status:"approved",active:true}).success).toBe(false);
 expect(imageType(new TextEncoder().encode('<svg onload="alert(1)">'))).toBeNull();
});
