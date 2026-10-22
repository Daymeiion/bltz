import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({admin:vi.fn(),service:vi.fn(),from:vi.fn(),select:vi.fn(),in:vi.fn()}));
vi.mock("@/lib/rbac",()=>({requireInternalAdmin:mocks.admin}));
vi.mock("@/lib/supabase/service",()=>({createServiceClient:mocks.service}));
import { readGtmPreviewCareerLinks } from "@/lib/gtm/preview-career-links";
beforeEach(()=>{vi.resetAllMocks();mocks.admin.mockResolvedValue({});mocks.service.mockReturnValue({from:mocks.from});mocks.from.mockReturnValue({select:mocks.select});mocks.select.mockReturnValue({in:mocks.in});});
describe("server-managed preview Career ID reads",()=>{
  it("authorizes before using the service client",async()=>{
    mocks.admin.mockRejectedValue(new Error("forbidden"));await expect(readGtmPreviewCareerLinks(["preview"])).rejects.toThrow("forbidden");expect(mocks.service).not.toHaveBeenCalled();
  });
  it("reads only explicit IDs and returns only the identity relationship",async()=>{
    mocks.in.mockResolvedValue({data:[{id:"preview",player_id:"career"}],error:null});
    expect(await readGtmPreviewCareerLinks(["preview","preview"])).toEqual(new Map([["preview","career"]]));
    expect(mocks.from).toHaveBeenCalledWith("preview_lockers");expect(mocks.select).toHaveBeenCalledWith("id,player_id");expect(mocks.in).toHaveBeenCalledWith("id",["preview"]);
  });
  it("batches large contact lists and distinguishes lookup failure from an unlinked preview",async()=>{
    mocks.in.mockResolvedValue({data:[],error:null});await readGtmPreviewCareerLinks(Array.from({length:201},(_,i)=>String(i)));expect(mocks.in).toHaveBeenCalledTimes(3);
    mocks.in.mockResolvedValue({data:null,error:{code:"42501"}});await expect(readGtmPreviewCareerLinks(["preview"])).rejects.toThrow("gtm_preview_career_links_unavailable:42501");
  });
  it("does not initialize a privileged client for an empty list",async()=>{expect(await readGtmPreviewCareerLinks([])).toEqual(new Map());expect(mocks.service).not.toHaveBeenCalled();});
});
