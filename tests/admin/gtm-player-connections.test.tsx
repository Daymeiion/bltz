import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { connectedCareerId, GtmPlayerConnections } from "@/components/admin/gtm/GtmPlayerConnections";
import { SelectedProspectsPanel } from "@/app/admin/gtm/funnel/SelectedProspectsPanel";
import { parseGtmPlayerProspectFilters, type GtmPlayerProspectsReadModel } from "@/lib/gtm/player-prospect-contract";

const previewId = "556ca192-d9b7-494f-93d6-a498af76ba5a";
const playerId = "c5dae871-a277-4256-9a0c-17a40940ad3f";

describe("GTM player connections", () => {
  it("routes to the canonical Career ID rather than the preview UUID or Player Master ID", () => {
    const html = renderToStaticMarkup(<GtmPlayerConnections gsisId="00-0026149" preview={{id:previewId,player_id:playerId}}/>);
    expect(html).toContain(`/admin/intelligence?athlete=${playerId}`);
    expect(html).not.toContain(`/admin/intelligence?athlete=${previewId}`);
    expect(html).toContain("/admin/gtm/players?gsis=00-0026149");
    expect(html).toContain(`activity_preview=${previewId}#preview-activity`);
    expect(html).toContain(`/admin/preview-lockers/${previewId}/edit`);
  });

  it("offers the existing reviewed identity workflow for an unlinked preview", () => {
    const html = renderToStaticMarkup(<GtmPlayerConnections preview={{id:previewId}}/>);
    expect(html).toContain("identity=review#preview-sportradar-panel");
    expect(html).not.toContain("/admin/intelligence?athlete=");
  });

  it("refuses to pick a Career ID when explicit links disagree", () => {
    expect(connectedCareerId(playerId, "different-player")).toBeNull();
    const html=renderToStaticMarkup(<GtmPlayerConnections preview={{id:previewId,player_id:playerId}} verifiedPlayerId="different-player"/>);
    expect(html).not.toContain("/admin/intelligence?athlete=");
    expect(connectedCareerId(null,playerId)).toBe(playerId);
  });

  it("preserves exact Master identity when names contain punctuation", () => {
    expect(parseGtmPlayerProspectFilters({gsis:"00-0023479"}).gsisId).toBe("00-0023479");
    expect(parseGtmPlayerProspectFilters({gsis:"00-0023479,or(id.eq.anything)"}).gsisId).toBe("");
  });
});

const filters=parseGtmPlayerProspectFilters({view:"selected"});
const data:GtmPlayerProspectsReadModel={state:"ready",total:1,page:1,pageCount:1,pageSize:50,filters,rows:[{
  gsisId:"00-0026149",displayName:"Keith Rivers",firstName:"Keith",lastName:"Rivers",collegeName:"USC",collegeConference:null,latestTeam:"BUF",position:"OLB",status:null,rookieSeason:2008,lastSeason:2014,yearsOfExperience:7,headshotUrl:null,selectedAt:"2026-10-01",contactId:"contact-id",previewId,previewSlug:"keith-rivers",previewState:"draft",careerPlayerId:playerId,
}]};

describe("Selected prospect visibility before conversion enrollment", () => {
  it("shows selected players, contact and preview setup even with no campaign enrollment", () => {
    const html=renderToStaticMarkup(<SelectedProspectsPanel data={data} contacts={[{id:"contact-id",email:null}]} enrollments={[]}/>);
    for(const label of ["Keith Rivers","No email recorded","Draft / incomplete","Not enrolled","Open contact","Open in Intelligence Lab"]) expect(html).toContain(label);
    expect(html).toContain("do not enroll a preview or send an invitation");
  });

  it("distinguishes test enrollments from the real conversion cohort", () => {
    const html=renderToStaticMarkup(<SelectedProspectsPanel data={data} contacts={[]} enrollments={[{preview_id:previewId,is_test:true}]}/>);
    expect(html).toContain("Test enrollment (excluded)");
  });

  it("does not represent unavailable selected data as an empty cohort", () => {
    const html=renderToStaticMarkup(<SelectedProspectsPanel data={{state:"restricted",rows:[],total:0,filters}} contacts={[]} enrollments={[]}/>);
    expect(html).toContain('role="alert"');
    expect(html).not.toContain("No players selected yet");
  });

  it("keeps interest submitted before enrollment visible without treating it as a verified response", () => {
    const html=renderToStaticMarkup(<SelectedProspectsPanel data={data} contacts={[]} enrollments={[]} inquiries={[{preview_id:previewId}]}/>);
    expect(html).toContain("1 unverified interest submission");
    expect(html).toContain("Not enrolled");
    expect(html).not.toContain("Claim interest received");
  });
});
