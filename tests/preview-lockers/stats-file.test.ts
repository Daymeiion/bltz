import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { readStatsFile } from "@/lib/preview-lockers/stats-file";
import { inspectPfrCsv, reviewPfrCsv } from "@/lib/preview-lockers/pfr-csv";
it("converts the actual 27,063-byte PFR Excel table without losing seasons or career totals", async () => {
  const html = readFileSync("tests/preview-lockers/antoine-cason-defense.xls", "utf8");
  const csv = await readStatsFile(new File([html], "sportsref_download (2).xls"), true);
  expect(csv).toContain("Season,Age,Team");
  const table = inspectPfrCsv(csv, "defense");
  const result = reviewPfrCsv(table, table.mapping, "defense", "https://www.pro-football-reference.com/players/C/CasoAn99.htm");
  expect(result.imported.seasons).toHaveLength(8);
  expect(result.imported.careerTotals).toMatchObject({gamesPlayed:110,gamesStarted:60,statistics:{interceptions:16}});
});
it("accepts a valid 27 KB CSV without conversion and distinguishes size and format errors", async () => {
  const csv = "Season,Team,G,Sk\n2024,AAA,17,2.5".padEnd(27063, "\n");
  await expect(readStatsFile(new File([csv], "nfl.CSV"), true)).resolves.toBe(csv);
  await expect(readStatsFile(new File(["x".repeat(100001)], "nfl.csv"), true)).rejects.toThrow("100,000 bytes");
  await expect(readStatsFile(new File(["not csv"], "nfl.xlsx"), true)).rejects.toThrow("For other Excel files, export as CSV first");
  await expect(readStatsFile(new File(["not csv"], "nfl.txt"))).rejects.toThrow("Choose a .csv file");
});
it("does not accept binary workbooks, multiple tables or excessive table dimensions", async () => {
  for (const text of ["PK binary workbook", "<html><table></table><table></table></html>"]) {
    await expect(readStatsFile(new File([text], "nfl.xls"), true)).rejects.toThrow("not a Sports Reference table export");
  }
  const html = (span: string) => `<html><table><tr><th ${span}>Season</th><th>Team</th></tr><tr><td>2024</td><td>AAA</td></tr></table></html>`;
  for (const span of ['colspan="1000000"', 'rowspan="1001"', 'colspan="NaN"']) await expect(readStatsFile(new File([html(span)], "nfl.xls"), true)).rejects.toThrow("unsupported row or column span");
  await expect(readStatsFile(new File([`<table>${"<tr><td>x</td></tr>".repeat(1001)}</table>`], "nfl.xls"), true)).rejects.toThrow("Too many statistics rows");
  await expect(readStatsFile(new File([`<table><tr>${"<td>x</td>".repeat(101)}</tr></table>`], "nfl.xls"), true)).rejects.toThrow("exceeds 100 columns");
});
it("keeps CSV-only callers opt-in and does not read or fetch rejected files", async () => {
  const file = new File(["<table></table>"], "college.xls");
  const read = vi.spyOn(file, "text");
  await expect(readStatsFile(file)).rejects.toThrow("Choose a .csv file");
  expect(read).not.toHaveBeenCalled();
});
