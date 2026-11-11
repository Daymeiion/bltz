"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternalAdmin } from "@/lib/rbac";
import { parsePlayerMasterCsv, PLAYER_MASTER_CSV_MAX_BYTES, type ParsedPlayerMaster } from "@/lib/players/master-import";
import { createClient } from "@/lib/supabase/server";

type PlayerMasterResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "invalid" | "unauthorized" | "unavailable" | "failed"; message: string };

export interface PlayerMasterPreview {
  filename: string;
  idempotencyKey: string;
  contentSha256: string;
  counts: {
    found: number;
    valid: number;
    newPlayers: number;
    existingPlayers: number;
    duplicates: number;
    invalid: number;
  };
  sample: Array<{
    gsisId: string;
    displayName: string;
    team: string | null;
    position: string | null;
    outcome: "create" | "update";
  }>;
  issues: Array<{ rowNumber: number; message: string }>;
}

async function getAuthorizedClient() {
  await requireInternalAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("unauthorized");
  return { supabase, userId: data.user.id };
}

async function readPlayerMasterFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) {
    throw new Error("Choose a Player Master CSV file.");
  }
  if (file.type && !["text/csv", "application/csv", "application/vnd.ms-excel"].includes(file.type)) {
    throw new Error("Choose a Player Master CSV file.");
  }
  if (file.size > PLAYER_MASTER_CSV_MAX_BYTES) throw new Error("Player Master CSV files must be 5 MB or smaller.");
  return { file, parsed: parsePlayerMasterCsv(Buffer.from(await file.arrayBuffer())) };
}

async function existingGsisIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parsed: ParsedPlayerMaster,
) {
  const ids = new Set<string>();
  const batches = Array.from({ length: Math.ceil(parsed.rows.length / 400) }, (_, index) => parsed.rows.slice(index * 400, index * 400 + 400));
  for (let offset = 0; offset < batches.length; offset += 6) {
    const results = await Promise.all(batches.slice(offset, offset + 6).map((batch) => supabase
      .from("nfl_players")
      .select("gsis_id")
      .in("gsis_id", batch.map((row) => row.gsis_id))));
    for (const result of results) {
      if (result.error) throw result.error;
      for (const row of result.data ?? []) ids.add(row.gsis_id);
    }
  }
  return ids;
}

export async function previewPlayerMasterCsv(formData: FormData): Promise<PlayerMasterResult<PlayerMasterPreview>> {
  let authorization;
  try { authorization = await getAuthorizedClient(); }
  catch { return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." }; }

  try {
    const { file, parsed } = await readPlayerMasterFile(formData);
    const existing = await existingGsisIds(authorization.supabase, parsed);
    const idempotencyKey = crypto.randomUUID();
    const counts = {
      found: parsed.rowsFound,
      valid: parsed.rows.length,
      newPlayers: parsed.rows.length - existing.size,
      existingPlayers: existing.size,
      duplicates: parsed.duplicateCount,
      invalid: parsed.issues.length,
    };
    const previewSummary = {
      valid: counts.valid,
      invalid: counts.invalid,
      duplicates: counts.duplicates,
      newPlayers: counts.newPlayers,
      existingPlayers: counts.existingPlayers,
    };
    const { error } = await authorization.supabase.from("gtm_import_jobs").insert({
      import_type: "player_master",
      filename: file.name,
      content_sha256: parsed.contentSha256,
      idempotency_key: idempotencyKey,
      status: "preview_ready",
      field_mapping: parsed.fieldMapping,
      preview_summary: previewSummary,
      rows_found: counts.found,
      rows_duplicated: counts.duplicates,
      rows_failed: counts.invalid,
      potential_matches: 0,
      uploaded_by: authorization.userId,
      started_at: new Date().toISOString(),
    });
    if (error) throw error;

    return {
      ok: true,
      value: {
        filename: file.name,
        idempotencyKey,
        contentSha256: parsed.contentSha256,
        counts,
        sample: parsed.rows.slice(0, 25).map((row) => ({
          gsisId: row.gsis_id,
          displayName: row.display_name,
          team: row.latest_team,
          position: row.position,
          outcome: existing.has(row.gsis_id) ? "update" : "create",
        })),
        issues: parsed.issues.slice(0, 25),
      },
    };
  } catch (error) {
    const unavailable = error && typeof error === "object" && "code" in error
      && (["42P01", "42883", "PGRST202", "PGRST205"] as unknown[]).includes(error.code);
    return {
      ok: false,
      code: unavailable ? "unavailable" : "invalid",
      message: unavailable
        ? "Player Master imports are not available until the database migration is applied."
        : error instanceof Error ? error.message : "The Player Master CSV could not be read.",
    };
  }
}

export async function commitPlayerMasterCsv(formData: FormData): Promise<PlayerMasterResult<{
  jobId: string;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}>> {
  let authorization;
  try { authorization = await getAuthorizedClient(); }
  catch { return { ok: false, code: "unauthorized", message: "Your administrator access could not be verified." }; }

  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  if (!z.string().uuid().safeParse(idempotencyKey).success) {
    return { ok: false, code: "invalid", message: "Preview the Player Master CSV again before importing." };
  }

  try {
    const { parsed } = await readPlayerMasterFile(formData);
    const { data, error } = await authorization.supabase.rpc("import_player_master", {
      p_content_sha256: parsed.contentSha256,
      p_duplicate_count: parsed.duplicateCount,
      p_idempotency_key: idempotencyKey,
      p_invalid_count: parsed.issues.length,
      p_rows: parsed.rows,
    });
    if (error || !data) {
      const unavailable = error?.code === "42883" || error?.code === "PGRST202";
      return {
        ok: false,
        code: unavailable ? "unavailable" : "failed",
        message: unavailable
          ? "Player Master imports are not available until the database migration is applied."
          : error?.message ?? "The Player Master import could not be committed. No partial import was kept.",
      };
    }
    const row = Array.isArray(data) ? data[0] : data;
    revalidatePath("/admin/gtm/imports");
    return {
      ok: true,
      value: {
        jobId: String(row.id),
        created: Number(row.rows_created),
        updated: Number(row.rows_updated),
        skipped: Number(row.rows_duplicated),
        failed: Number(row.rows_failed),
      },
    };
  } catch (error) {
    return { ok: false, code: "invalid", message: error instanceof Error ? error.message : "The Player Master CSV could not be imported." };
  }
}
