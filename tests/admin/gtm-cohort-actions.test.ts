import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({rpc:vi.fn(),admin:vi.fn(),revalidate:vi.fn()}));
vi.mock("next/cache",()=>({revalidatePath:mocks.revalidate}));
vi.mock("@/lib/rbac",()=>({requireInternalAdmin:mocks.admin}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({rpc:mocks.rpc})}));
import { selectPlayerMasterProspects } from "@/app/admin/gtm/players/actions";

beforeEach(()=>{vi.resetAllMocks();mocks.admin.mockResolvedValue({});});
describe("automatic cohort selection action",()=>{
  it("validates identifiers and authorization before calling the database",async()=>{
    expect(await selectPlayerMasterProspects({gsisIds:["not-a-gsis"]})).toMatchObject({ok:false,code:"invalid"});
    expect(await selectPlayerMasterProspects({gsisIds:["00-0000001","00-0000001"]})).toMatchObject({ok:false,code:"invalid"});
    mocks.admin.mockRejectedValue(new Error("forbidden"));
    expect(await selectPlayerMasterProspects({gsisIds:["00-0000001"]})).toMatchObject({ok:false,code:"unauthorized"});
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("uses a single atomic RPC and refreshes contact, preview, funnel and Lab destinations",async()=>{
    mocks.rpc.mockResolvedValue({data:{selectedCount:1,existingCount:0,linkedPlayerCount:1,reviewRequired:[]},error:null});
    expect(await selectPlayerMasterProspects({gsisIds:["00-0000001"]})).toEqual({ok:true,selectedCount:1,existingCount:0,linkedPlayerCount:1,reviewCount:0});
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("connect_gtm_player_cohort",{p_gsis_ids:["00-0000001"]});
    for(const path of ["/admin/gtm/players","/admin/gtm/contacts","/admin/gtm/funnel","/admin/preview-lockers","/admin/intelligence"])expect(mocks.revalidate).toHaveBeenCalledWith(path);
  });
  it("reports review-required records without pretending they are connected",async()=>{
    mocks.rpc.mockResolvedValue({data:{selectedCount:1,existingCount:0,linkedPlayerCount:0,reviewRequired:[{gsisId:"00-0000001",reason:"existing_athlete_requires_review"}]},error:null});
    expect(await selectPlayerMasterProspects({gsisIds:["00-0000001"]})).toMatchObject({ok:true,linkedPlayerCount:0,reviewCount:1});
  });
  it("distinguishes unavailable migrations and uncertain transport outcomes",async()=>{
    mocks.rpc.mockResolvedValue({data:null,error:{code:"PGRST202"}});
    expect(await selectPlayerMasterProspects({gsisIds:["00-0000001"]})).toMatchObject({ok:false,code:"unavailable"});
    mocks.rpc.mockRejectedValue(new Error("disconnected"));
    expect(await selectPlayerMasterProspects({gsisIds:["00-0000001"]})).toMatchObject({ok:false,message:expect.stringContaining("could not be confirmed")});
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
