import {describe,it,expect} from "vitest";
import {conversionInput,funnelMetrics,readAttribution} from "@/lib/preview-lockers/conversion";
const id="00000000-0000-4000-8000-000000000001";
describe("conversion contracts",()=>{
  it("requires explicit permission and email and rejects private analytics metadata",()=>{
    const input={preview_id:id,request_id:id,session_id:id,action:"claim_submit",data:{email:"athlete@example.test",consent:true}};
    expect(conversionInput.safeParse(input).success).toBe(true);
    expect(conversionInput.safeParse({...input,data:{email:"athlete@example.test"}}).success).toBe(false);
    expect(conversionInput.safeParse({...input,data:{...input.data,utm:{email:"private@example.test"}}}).success).toBe(false);
    expect(conversionInput.safeParse({...input,action:"booking_confirmed"}).success).toBe(false);
  });
  it("preserves only bounded campaign codes from URLs",()=>{
    expect(readAttribution("?utm_source=alumni&utm_medium=email&utm_campaign=sprint90&email=private@example.test")).toEqual({utm_source:"alumni",utm_medium:"email",utm_campaign:"sprint90"});
    expect(readAttribution("?utm_source=private@example.test&utm_campaign="+"a".repeat(81))).toEqual({});
  });
  it("counts unique sent-preview conversions separately from sessions and events",()=>{
    const campaigns=[{preview_id:"one",contact_id:"athlete",sent_at:"now",is_test:false},{preview_id:"two",contact_id:"other",sent_at:null,is_test:false},{preview_id:"test",contact_id:"test",sent_at:"now",is_test:true}];
    const events=[{preview_id:"one",kind:"view",session_id:"a"},{preview_id:"one",kind:"view",session_id:"b"},{preview_id:"one",kind:"claim_submit",session_id:"a"},{preview_id:"two",kind:"claim_submit",session_id:"c"},{preview_id:"test",kind:"claim_submit",session_id:"d"},{preview_id:"one",kind:"booking_click",session_id:"a"}];
    const result=funnelMetrics(campaigns,events);
    expect(result.sent).toBe(1);expect(result.athletes).toBe(2);expect(result.sessions).toBe(2);
    expect(result.stages.find(s=>s.kind==="claim_submit")).toMatchObject({previews:2,numerator:1,denominator:1});
    expect(result.stages.find(s=>s.kind==="booking_confirmed")?.previews).toBe(0);
    expect(funnelMetrics([],[]).stages[0].denominator).toBe(0);
  });
});
