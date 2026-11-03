import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ExactSchoolIdentityResult,
  ExactSchoolThemeAdapter,
} from "@/lib/enterprise-crm/theme/resolver";

const HEX_COLOR = /^#?[0-9a-f]{6}$/i;

function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!HEX_COLOR.test(trimmed)) return null;
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

/**
 * Maps a `schools` row joined to its exact `"Colleges"` directory row. Only the
 * typed `college_directory_id` link counts; names, slugs and `meta` never do.
 */
export function parseSchoolIdentity(
  schoolId: string,
  row: unknown,
): ExactSchoolIdentityResult {
  if (typeof row !== "object" || row === null) return { kind: "missing" };
  const record = row as {
    id?: unknown;
    college_directory_id?: unknown;
    directory?: unknown;
  };
  if (record.id !== schoolId || typeof record.college_directory_id !== "number") {
    return { kind: "missing" };
  }

  const directory = Array.isArray(record.directory) ? record.directory : [record.directory];
  if (directory.length !== 1 || typeof directory[0] !== "object" || directory[0] === null) {
    return directory.length > 1 ? { kind: "ambiguous" } : { kind: "missing" };
  }

  const college = directory[0] as {
    id?: unknown;
    primary_color_hex?: unknown;
    secondary_color_hex?: unknown;
    logo_url?: unknown;
  };
  const primaryColor = normalizeHex(college.primary_color_hex);
  const secondaryColor = normalizeHex(college.secondary_color_hex);
  if (college.id !== record.college_directory_id || !primaryColor || !secondaryColor) {
    return { kind: "unsafe" };
  }

  const logoUrl = typeof college.logo_url === "string" && college.logo_url.trim()
    ? college.logo_url.trim()
    : null;

  return {
    kind: "exact",
    record: {
      schoolId,
      directoryRecordId: String(college.id),
      linkEvidence: "approved_typed_link",
      linkVersion: `colleges-${college.id}`,
      primaryColor,
      secondaryColor,
      logoUrl,
    },
  };
}

export function createSupabaseSchoolThemeAdapter(client: SupabaseClient): ExactSchoolThemeAdapter {
  return {
    async resolveExactIdentity(schoolId) {
      const { data, error } = await client
        .from("schools")
        .select(
          'id, college_directory_id, directory:"Colleges"!schools_college_directory_id_fkey(id, primary_color_hex, secondary_color_hex, logo_url)',
        )
        .eq("id", schoolId)
        .maybeSingle();
      if (error) return { kind: "missing" };
      return parseSchoolIdentity(schoolId, data);
    },
  };
}
