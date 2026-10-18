// @vitest-environment node
import { expect, it } from "vitest";
import { filenameWords, suggestAwardImageMatches, approveImageMatches } from "@/lib/award-images/matches";
import { originalFilename, type AwardImage, type AwardImageLibrary } from "@/lib/award-images/model";
const catalog = [
  {id:"thorpe",name:"Thorpe Award",slug:"thorpe-award",aliases:["Jim Thorpe Award"],level:"college"},
  {id:"consensus",name:"Consensus All-American",slug:"consensus-all-american",aliases:[],level:"college"},
  {id:"unanimous",name:"Unanimous All-American",slug:"unanimous-all-american",aliases:[],level:"college"},
  {id:"first",name:"First-team All-American",slug:"first-team-all-american",aliases:[],level:"college"},
  {id:"nfl",name:"NFL MVP",slug:"nfl-mvp",aliases:[],level:"pro"},
  {id:"college",name:"MVP",slug:"college-mvp",aliases:[],level:"college"},
].map(row=>({...row,active:true})) as AwardImageLibrary["catalog"];
const image=(filename:string)=>({id:"image",title:"Edited image title",original_filename:filename,active:true,asset_status:"placeholder",revision:1}) as AwardImage;
const suggestions=(filename:string)=>suggestAwardImageMatches({images:[image(filename)],catalog});
it.each(["JimThorpeAward.png","jim-thorpe-award-2007-final-300x400 (2).PNG","jimthorpeaward.webp","Thorpe-Trophy.jpg"])("matches descriptive filename %s despite title edits",filename=>{
 const rows=suggestions(filename);expect(rows.map(row=>row.award.id)).toEqual(["thorpe"]);expect(rows[0]).toMatchObject({confidence:"clear",sourceKind:"filename",sourceName:filename});
});
it("shows generic All-American artwork as multiple uncertain variants",()=>{
 const rows=suggestions("Award-AllAmericanIcon.png");expect(rows.map(row=>row.award.id).sort()).toEqual(["consensus","first","unanimous"]);expect(rows.every(row=>row.confidence==="review")).toBe(true);
 expect(suggestions("FirstTeamAllAmerican.webp").map(row=>row.award.id)).toEqual(["first"]);
 expect(suggestions("1st-Team-All-American.webp").map(row=>row.award.id)).toEqual(["first"]);
 expect(suggestions("All-American-Consensus.png").map(row=>row.award.id)).toEqual(["consensus"]);
 expect(suggestions("Unanimous-All-American.png").map(row=>row.award.id)).toEqual(["unanimous"]);
});
it("preserves qualifiers and ignores vague, inactive and already-applied matches",()=>{
 expect(suggestions("NFL-MVP-icon.png").map(row=>row.award.id)).toEqual(["nfl"]);
 for(const filename of ["trophy.png","award-star-final.jpg","ConferenceIcon.png","Vacation.webp"])expect(suggestions(filename)).toEqual([]);
 expect(suggestAwardImageMatches({images:[{...image("Thorpe.png"),active:false}],catalog})).toEqual([]);
 expect(suggestAwardImageMatches({images:[image("Thorpe.png")],catalog:catalog.map(row=>({...row,image_asset_id:"image"}))})).toEqual([]);
 expect(filenameWords("Jim-Thorpe-Award-2007-300x400-final.png")).toEqual(["jim","thorpe","award"]);
});
it("keeps multiple candidate images visible and labels legacy title-based suggestions honestly",()=>{
 const rows=suggestAwardImageMatches({images:[{...image("Thorpe.png"),id:"one"},{...image("Thorpe.png"),id:"two"},{...image(""),id:"old",original_filename:null,title:"Jim Thorpe Award trophy"}],catalog});
 expect(rows).toHaveLength(3);expect(rows.find(row=>row.image.id==="old")?.sourceKind).toBe("legacy_title");
 const ambiguous=suggestAwardImageMatches({images:[image("Thorpe-Award.png")],catalog:[catalog[0],{...catalog[0],id:"duplicate-definition"}]});
 expect(ambiguous).toHaveLength(2);expect(ambiguous.every(row=>row.confidence==="review")).toBe(true);
});
it("validates bounded batches and filename basenames",()=>{
 const row={award_id:"00000000-0000-4000-8000-000000000001",image_asset_id:"00000000-0000-4000-8000-000000000002",award_updated_at:"2026-10-17T12:00:00+00:00",image_revision:1};
 expect(approveImageMatches.safeParse({matches:[row]}).success).toBe(true);
 for(const matches of [[],[row,row],Array(101).fill(row),[{...row,image_revision:0}],[{...row,unexpected:true}]])expect(approveImageMatches.safeParse({matches}).success).toBe(false);
 for(const name of ["folder/image.png","folder\\image.png","bad\nname.png","", "x".repeat(256)])expect(originalFilename.safeParse(name).success).toBe(false);
});
