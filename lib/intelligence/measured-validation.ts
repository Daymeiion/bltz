import { z } from "zod";
import { bltzEventSchema } from "@/lib/analytics/bltz-event";
import { featureSubjectSchema } from "./features/contracts";

const date=z.string().datetime({offset:true});
const coverage=z.object({state:z.enum(["complete","partial","unavailable"]),start:date.nullable(),end:date.nullable(),fraction:z.number().min(0).max(1).nullable(),measurementVersion:z.string().max(80).nullable(),instrumentedEvents:z.array(z.string().max(80)).max(100)}).strict();
/** Only this bounded initial input can be persisted/refreshed; trusted distribution
 * and reviewed media adapters will extend it through explicit server contracts. */
export const measuredInputSchema=z.object({
  subject:featureSubjectSchema,scope:z.object({kind:z.literal("public_audience")}).strict(),environment:z.enum(["development","production"]),
  events:z.array(bltzEventSchema).max(5000),asOf:date,computedAt:date,eventWatermark:date,runId:z.string().uuid(),
  inputSnapshotHash:z.string().regex(/^[a-f0-9]{64}$/),inputSnapshotReference:z.string().max(160),inputRevision:z.number().int().positive(),
  coverage:z.object({current:coverage,baseline:coverage}).strict(),queryTruncated:z.boolean(),
}).strict().superRefine((input,context)=>{
  input.events.forEach((event,index)=>{
    if(event.environment!==input.environment)context.addIssue({code:"custom",path:["events",index,"environment"],message:"Event environment must match measured input scope."});
  });
});
