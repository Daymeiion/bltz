import { expect, it } from "vitest";
import { conversionInput } from "@/lib/preview-lockers/conversion";

const id = "00000000-0000-4000-8000-000000000001";
const claim = (details: object) => conversionInput.safeParse({preview_id:id, request_id:id, session_id:id, action:"claim_submit", data:{email:"athlete@example.test",consent:true,...details}});
it("requires referral name and email while allowing an optional phone", () => {
  expect(claim({feature_requests:"Add my championship season", referrals:[{full_name:"Test Player",email:"player@example.test"},{full_name:"Second Player",email:"second@example.test",phone:"+1 (555) 010-1234"}]}).success).toBe(true);
  expect(claim({referrals:[{full_name:"Test Player",phone:"+1 (555) 010-1234"}]}).success).toBe(false);
  expect(claim({referrals:[{email:"player@example.test"}]}).success).toBe(false);
});
it("rejects missing referral contacts, malformed contacts and oversized requests", () => {
  expect(claim({referrals:[{full_name:"Test Player"}]}).success).toBe(false);
  expect(claim({referrals:[{full_name:"Test Player",email:"player@example.test",phone:"not a phone"}]}).success).toBe(false);
  expect(claim({referrals:Array.from({length:11},()=>({full_name:"Test Player",email:"player@example.test"}))}).success).toBe(false);
  expect(claim({feature_requests:"x".repeat(2001)}).success).toBe(false);
});
