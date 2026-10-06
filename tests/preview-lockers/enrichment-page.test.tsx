import { beforeEach, expect, it, vi } from "vitest";
import { Children, isValidElement } from "react";
import PreviewLocker from "@/app/preview-lockers/[slug]/page";
import EditPreview from "@/app/admin/preview-lockers/[id]/edit/page";
import EnrichmentPanel from "@/app/admin/preview-lockers/EnrichmentPanel";
import PreviewLockerForm from "@/app/admin/preview-lockers/PreviewLockerForm";
import { previewContent } from "@/lib/preview-lockers/validation";

const mocks = vi.hoisted(() => ({
  read: vi.fn(), stats: vi.fn(), admin: vi.fn(), service: vi.fn(),
  adminFrom: vi.fn(), serviceFrom: vi.fn(), rpc: vi.fn(),
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/lib/preview-lockers/server", () => ({
  readPrivatePreview: mocks.read, previewAdmin: mocks.admin, PREVIEW_COLUMNS: "preview-columns",
  PreviewError: class extends Error { constructor(public code: string, public status: number) { super(code); } },
}));
vi.mock("@/lib/player/structured-stats", () => ({ readPreviewStructuredStats: mocks.stats }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.service }));
vi.mock("@/app/player/[slug]/LockerView", () => ({ default: () => null }));
vi.mock("@/app/admin/preview-lockers/PreviewLockerForm", () => ({ default: () => null }));

const id = "00000000-0000-4000-8000-000000000001";
const signedPhotoUrl = "https://media.example.com/signed.jpg?token=private";
const record = () => ({ ...previewContent.parse({
  slug: "fixture-athlete", full_name: "Fixture Athlete", awards: [{ year: "2001", label: "Admin honor", photoId: "photo" }],
  photos: [{ id: "photo", title: "Award photo", url: signedPhotoUrl, level: "pro" }],
}), id, revision: 3, created_at: "", updated_at: "" });

function query(data: unknown, error: unknown = null) {
  const result = { data, error };
  const chain = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  for (const method of [chain.select, chain.eq, chain.order, chain.limit]) method.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue({ ...record(), publicLink: true });
  mocks.stats.mockResolvedValue([]);
  mocks.admin.mockResolvedValue({ client: { from: mocks.adminFrom, rpc: mocks.rpc } });
  mocks.service.mockReturnValue({ from: mocks.serviceFrom });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
});

it("rejects unavailable preview access before reading stats or exposing enrichment", async () => {
  mocks.read.mockResolvedValue(null);
  await expect(PreviewLocker({ params: Promise.resolve({ slug: "fixture-athlete" }) })).rejects.toThrow("NOT_FOUND");
  expect(mocks.stats).not.toHaveBeenCalled();
  expect(mocks.service).not.toHaveBeenCalled();
});

it("keeps published invite projection, signed admin award images and saved stats with enrichment", async () => {
  mocks.read.mockResolvedValue({ ...record(), publicLink: true, enrichment: {
    awards: [{ year: "2001", label: "Normalized honor", photoId: "photo", attribution: "Reference source", evidenceStatus: "unverified" }],
    articles: [{ headline: "Career article", article_url: "https://publisher.example.com/career", publisher: "Publisher" }],
    report: { privateDiagnostic: "must not be projected" },
  } });
  mocks.stats.mockResolvedValue([{ league: "nfl", career: { tackles: 127 } }]);
  const page = await PreviewLocker({ params: Promise.resolve({ slug: "fixture-athlete" }) });
  const data = page.props.data;
  expect(data.awards[0]).toMatchObject({ label: "Normalized honor", imageUrl: signedPhotoUrl, attribution: "Reference source", evidenceStatus: "unverified" });
  expect(data.photos[0]).toMatchObject({ licenseLabel: "PREVIEW LOCKER", provenance: "BLTZ preview" });
  expect(data.articles).toEqual([{ headline: "Career article", article_url: "https://publisher.example.com/career", publisher: "Publisher" }]);
  expect(data.structuredStats).toEqual([{ league: "nfl", career: { tackles: 127 } }]);
  expect(data.athleteId).toBeNull();
  expect(data).not.toHaveProperty("report");
  expect(JSON.stringify(data)).not.toContain("privateDiagnostic");
  expect(mocks.service).not.toHaveBeenCalled();
});

it("keeps manually entered awards and empty news when supplemental enrichment is unavailable", async () => {
  const page = await PreviewLocker({ params: Promise.resolve({ slug: "fixture-athlete" }) });
  expect(page.props.data.awards[0]).toMatchObject({ label: "Admin honor", imageUrl: signedPhotoUrl });
  expect(page.props.data.articles).toEqual([]);
});

it("preserves college and team suggestions in the editor while adding saved enrichment diagnostics", async () => {
  const saved = record();
  mocks.adminFrom.mockImplementation((table: string) => query(table === "preview_lockers" ? saved
    : table === "gtm_player_preview_lockers" ? { gsis_id: "fixture-gsis", completed_revision: 3 }
      : { report: { status: "complete", errors: [] }, source_revision: 3 }));
  mocks.serviceFrom.mockImplementation((table: string) => query(table === "preview_lockers" ? { player_id: "fixture-player" }
    : table === "nfl_players" ? { college_name: "Syracuse", latest_team: "New York Jets" }
      : table === "player_stat_ingestions" ? [{ league: "nfl", raw_profile: {}, normalized: { seasons: [{ team: "St. Louis Rams" }] } }]
        : [{ display_name: "Syracuse", abbreviation: "SYR", primary_color: "#D44500", logo_url: "https://media.example.com/syracuse.png", logo_dark_url: null }]));
  const page = await EditPreview({ params: Promise.resolve({ id }) });
  const children = Children.toArray(page.props.children).filter(isValidElement);
  const form = children.find(child => child.type === PreviewLockerForm)!;
  const panel = children.find(child => child.type === EnrichmentPanel)!;
  expect(form.props).toMatchObject({ viewerAssigned: true, gtmLinked: true, gtmCompleted: true });
  const editedRecord = (form.props as { record: ReturnType<typeof record> }).record;
  expect(editedRecord.school).toBe("Syracuse");
  expect(editedRecord.schools[0]).toMatchObject({ label: "SYR", color: "#D44500" });
  expect(editedRecord.pro_teams.map(team => team.label)).toEqual(["St. Louis Rams", "New York Jets"]);
  expect(panel.props).toMatchObject({ id, initialReport: { status: "complete", errors: [] }, stale: false });
});
