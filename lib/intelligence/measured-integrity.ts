import { createHash } from "node:crypto";

/** Deterministic JSON hash survives Postgres jsonb's object-key reordering.
 * The only excluded field is the hash itself; IDs, revisions, truncation and
 * coverage declarations remain part of the preserved input contract.
 */
export function canonicalInputJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalInputJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalInputJson(item)}`).join(",")}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("invalid_preserved_input");
  return encoded;
}

export function measuredInputHash(input: Record<string, unknown>): string {
  const content = Object.fromEntries(Object.entries(input).filter(([key]) => key !== "inputSnapshotHash"));
  return createHash("sha256").update(canonicalInputJson(content)).digest("hex");
}
