import { z } from "zod";
import { IntelligenceAccessError } from "@/lib/intelligence/lab-server";
import { loadMeasuredIntelligence, refreshMeasuredIntelligence } from "@/lib/intelligence/measured-server";
import { AnalyticsBodyLimitError, readBoundedBody } from "@/lib/analytics/delivery/http";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",Vary:"Cookie"};
function failure(error:unknown){const status=error instanceof AnalyticsBodyLimitError?413:error instanceof IntelligenceAccessError?error.status:503;return Response.json({error:status===413?"Payload too large.":status===401?"Sign in required.":status===403?"Internal admin required.":"Development measurements are unavailable."},{status,headers});}
export async function GET(request:Request){
  const playerId=new URL(request.url).searchParams.get("playerId");if(!z.string().uuid().safeParse(playerId).success)return Response.json({error:"Invalid player."},{status:400,headers});
  try{return Response.json(await loadMeasuredIntelligence(playerId!),{headers});}catch(error){return failure(error);}
}
export async function POST(request:Request){
  if(request.headers.get("origin")!==new URL(request.url).origin)return Response.json({error:"Same-origin request required."},{status:403,headers});
  try{const raw=await readBoundedBody(request,512);
    const data=z.object({playerId:z.string().uuid()}).strict().safeParse(JSON.parse(raw));if(!data.success)return Response.json({error:"Invalid player."},{status:400,headers});
    return Response.json(await refreshMeasuredIntelligence(data.data.playerId),{headers});
  }catch(error){return failure(error);}
}
