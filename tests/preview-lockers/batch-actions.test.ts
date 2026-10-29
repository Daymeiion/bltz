// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ rows: vi.fn(), admin: vi.fn(), select: vi.fn(), open: vi.fn(), filters: [] as string[][] }));
vi.mock("@/lib/preview-lockers/server", () => ({ PREVIEW_COLUMNS: "*", previewAdmin: mock.admin }));
vi.mock("@/app/admin/gtm/players/actions", () => ({ selectPlayerMasterProspects: mock.select, openPlayerMasterPreview: mock.open }));
import { addBatchToCohort, matchBatchNames } from "@/app/admin/preview-lockers/batch/actions";

const player = (gsis: string, college = "Arizona") => ({ gsis_id: gsis, display_name: "Antoine Cason", college_name: college, latest_team: "LAC", position: "CB", last_season: 2015 });
beforeEach(() => {
  vi.resetAllMocks(); mock.filters = [];
  // Minimal query builder: records ilike filters and resolves rows for the current pattern.
  const query = (filters: string[]) => ({
    ilike(column: string, value: string) { filters.push(`${column}=${value}`); return this; },
    order() { return this; },
    limit: async () => mock.rows(filters),
  });
  mock.admin.mockResolvedValue({ client: { from: () => ({ select: () => { const filters: string[] = []; mock.filters.push(filters); return query(filters); } }) } });
});

it("auto-selects only a single exact match", async () => {
  mock.rows.mockImplementation((filters: string[]) => ({ data: filters[0] === "display_name=Antoine Cason" ? [player("00-0026234")] : [], error: null }));
  const result = await matchBatchNames("Antoine Cason");
  expect(result).toMatchObject({ ok: true, matches: [{ name: "Antoine Cason", gsisId: "00-0026234" }] });
});

it("asks for a choice when several players share the name, and narrows by college", async () => {
  mock.rows.mockReturnValue({ data: [player("00-0000001"), player("00-0000002", "Ohio State")], error: null });
  const result = await matchBatchNames("Antoine Cason\nAntoine Cason, Ohio State");
  expect(result.ok && result.matches.map(match => match.gsisId)).toEqual([null, null]);
  expect(mock.filters[1]).toEqual(["display_name=Antoine Cason", "college_name=%Ohio State%"]);
});

it("offers contains-matches without choosing one", async () => {
  mock.rows.mockImplementation((filters: string[]) => ({ data: filters[0].includes("%") ? [player("00-0026234")] : [], error: null }));
  const result = await matchBatchNames("Cason");
  expect(result).toMatchObject({ ok: true, matches: [{ gsisId: null, candidates: [{ gsis_id: "00-0026234" }] }] });
  expect(mock.filters.map(filters => filters[0])).toEqual(["display_name=Cason", "display_name=%Cason%"]);
});

it("refuses non-admins and oversized lists without querying", async () => {
  expect(await matchBatchNames(Array.from({ length: 101 }, (_, i) => `Player ${i}`).join("\n"))).toMatchObject({ ok: false });
  mock.admin.mockRejectedValue(new Error("forbidden"));
  expect(await matchBatchNames("Antoine Cason")).toEqual({ ok: false, message: "Your administrator access could not be verified." });
  expect(mock.rows).not.toHaveBeenCalled();
});

it("adds the chosen players to the cohort through the existing Player Master action", async () => {
  mock.select.mockResolvedValue({ ok: true, selectedCount: 2, existingCount: 0, linkedPlayerCount: 0, reviewCount: 0 });
  expect(await addBatchToCohort(["00-0000001", "00-0000002"])).toEqual({ ok: true, reviewCount: 0 });
  expect(mock.select).toHaveBeenCalledWith({ gsisIds: ["00-0000001", "00-0000002"] });
});
