import {describe,it,expect} from "vitest";
import {previewSprintEventSchema} from "@/lib/analytics/bltz-event";
import {previewEventInputSchema} from "@/lib/analytics/preview-event";
const id="10000000-0000-4000-8000-000000000001";
const event={event_id:id,schema_version:1,event_name:"preview_email_bounced",event_version:"preview-sprint-v1",occurred_at:"2026-10-11T21:00:00Z",received_at:"2026-10-11T21:00:01Z",environment:"production",surface:"preview",producer:"bltz_collector",actor_kind:"operational",measurement_basis:"server_workflow",audience_eligible:false,subject_player_id:null,moment_id:null,asset_id:null,asset_model:null,session_id:null,scope_key:"preview_sprint",source_channel:"unknown",properties:{preview_id:id,event_kind:"email_bounced"}};
describe("private email analytics definitions",()=>{
 it("does not permit a browser to forge transport events",()=>expect(previewEventInputSchema.safeParse({previewId:id,eventId:id,sessionId:id,eventName:"email_bounced"}).success).toBe(false));
 it("accepts reviewed metadata-only server facts",()=>expect(previewSprintEventSchema.safeParse(event).success).toBe(true));
 it("rejects client/session attribution for delivery facts",()=>{expect(previewSprintEventSchema.safeParse({...event,actor_kind:"anonymous",measurement_basis:"unverified_client",session_id:id}).success).toBe(false);expect(previewSprintEventSchema.safeParse({...event,session_id:id}).success).toBe(false);});
 it("rejects recipient/message/URL properties in analytics",()=>{for(const extra of [{recipient:"private@example.test"},{message_id:"sensitive"},{url:"https://bltz.vercel.app/private"}])expect(previewSprintEventSchema.safeParse({...event,properties:{...event.properties,...extra}}).success).toBe(false);});
});
