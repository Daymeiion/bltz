// @vitest-environment node
import { expect, it } from "vitest";
import { previewContent, previewCombineResult } from "@/lib/preview-lockers/validation";
import { mergeSuggestions } from "@/lib/preview-lockers/merge-suggestions";
import { combineValue } from "@/lib/player/combine";
const identity={slug:"fixture-player",full_name:"Fixture Player"};
const event={id:"combine-2008",eventType:"combine",year:2008,sourceUrl:"https://league.example.com/fixture",timing:"official",measurements:[{metric:"forty",value:4.55,sourceUrl:null},{metric:"bench",value:0,sourceUrl:null}]};
it("retains event context, source overrides, zero bench reps and unknown values through JSON save/reload",()=>{
  const content=previewContent.parse({...identity,combine_results:[event,{...event,id:"pro-day",eventType:"pro_day",sourceUrl:null,measurements:[{metric:"forty",value:4.49,sourceUrl:"https://school.example.com/pro-day"}]}]});
  expect(previewContent.parse(JSON.parse(JSON.stringify(content)))).toEqual(content);
  expect(content.combine_results[0].measurements[1].value).toBe(0);
  expect(content.combine_results[0].measurements.some(item=>item.metric==="vertical")).toBe(false);
  expect(combineValue("broad_jump",122)).toBe("10′ 2″");
  expect(combineValue("forty",4.5)).toBe("4.50");
  expect(combineValue("forty",4.555)).toBe("4.555");
});
it.each([
  {...event,sourceUrl:null}, {...event,sourceUrl:"http://example.com/result"}, {...event,sourceUrl:"https://user:pass@example.com/result"},
  {...event,sourceUrl:"https://host.local/result"}, {...event,year:2008.5}, {...event,eventType:"invented"},
  {...event,measurements:[{metric:"forty",value:0}]}, {...event,measurements:[{metric:"bench",value:1.5}]},
  {...event,measurements:[{metric:"broad_jump",value:241}]}, {...event,measurements:[event.measurements[0],event.measurements[0]]},
])("rejects invalid or unsourced measurements %#",invalid=>expect(previewCombineResult.safeParse(invalid).success).toBe(false));
it("allows an empty event draft and defaults older records to an empty collection",()=>{
  expect(previewCombineResult.safeParse({...event,sourceUrl:null,measurements:[]}).success).toBe(true);
  expect(previewContent.parse(identity).combine_results).toEqual([]);
});
it("never lets discovery populate, replace or clear manual event results",()=>{
  const saved=previewContent.parse({...identity,combine_results:[event]});
  const blank=previewContent.parse(identity);
  const replacement=previewContent.parse({...identity,combine_results:[{...event,measurements:[{metric:"forty",value:4.1}]}]});
  for(const suggestion of [blank,replacement]) expect(mergeSuggestions(saved,suggestion).combine_results).toEqual(saved.combine_results);
  expect(mergeSuggestions(blank,replacement).combine_results).toEqual([]);
});
