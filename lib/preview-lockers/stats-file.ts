import { CSV_LIMIT, csvRows } from "./cfb-csv";

/** Read locally; only the reviewed statistics, never the uploaded file, can be saved. */
export async function readStatsFile(file: File, allowSportsReferenceExcel = false): Promise<string> {
  const name = file.name.trim();
  const csv = /\.csv$/i.test(name);
  const referenceExcel = allowSportsReferenceExcel && /\.xls$/i.test(name);
  if (!csv && !referenceExcel) throw new Error(allowSportsReferenceExcel
    ? "Choose a .csv file or a Sports Reference .xls table export. For other Excel files, export as CSV first."
    : "Choose a .csv file. For Excel files, export as CSV first.");
  if (file.size > CSV_LIMIT) throw new Error(`The selected file is ${(file.size / 1000).toFixed(1)} KB. The limit is 100 KB (100,000 bytes).`);
  const text = await file.text();
  if (new TextEncoder().encode(text).length > CSV_LIMIT) throw new Error("File contents must be 100 KB (100,000 bytes) or smaller.");
  if (csv) return text;

  // Sports Reference's Excel download is an HTML table, not a binary workbook.
  // Do not interpret arbitrary XLS/XLSX containers or render uploaded HTML.
  const html = text.replace(/<!--[\s\S]*?-->/g, "");
  if (!/^\s*(?:<!doctype\s+html[^>]*>\s*)?<(?:html|table)\b/i.test(html)
    || (html.match(/<table\b/gi) ?? []).length !== 1 || !/<\/table\s*>/i.test(html)) {
    throw new Error("This .xls file is not a Sports Reference table export. Export it as CSV and upload that file instead.");
  }
  if ((html.match(/<tr\b/gi) ?? []).length > 1000) throw new Error("Too many statistics rows. Export one table at a time.");
  // Bound spans before parsing and the worksheet range before serializing.
  for (const cell of html.matchAll(/<t[dh]\b[^>]*>/gi)) {
    for (const span of cell[0].matchAll(/\b(colspan|rowspan)\s*=\s*["']?([^\s"'>]+)/gi)) {
      const count = Number(span[2]);
      if (!Number.isInteger(count) || count < 1 || count > (span[1].toLowerCase() === "colspan" ? 100 : 1000)) throw new Error("The table contains an unsupported row or column span. Export it as CSV instead.");
    }
  }
  const { read, utils } = await import("xlsx");
  const workbook = read(html, { type: "string", raw: true, cellFormula: false, cellHTML: false, sheetRows: 1001 });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet?.["!ref"]) throw new Error("No statistics table was found in this export.");
  const range = utils.decode_range(sheet["!ref"]);
  if (range.e.c >= 100 || range.e.r >= 1000) throw new Error("The statistics table exceeds 100 columns or 1,000 rows. Export one table at a time.");
  const converted = utils.sheet_to_csv(sheet, { blankrows: false });
  csvRows(converted); // Reuse CSV byte, row, column and quoting limits after conversion.
  return converted;
}
