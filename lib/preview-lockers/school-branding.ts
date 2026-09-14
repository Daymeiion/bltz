import type { SupabaseClient } from "@supabase/supabase-js";
import { matchSchoolBrand, type PreviewBrandingSource } from "./branding";

// Read reference branding; never create or change an athlete affiliation here.
export async function enrichPreviewSchoolBranding<T extends PreviewBrandingSource>(client: SupabaseClient, row: T): Promise<T> {
  if (!row.school && !row.school_info?.name && !row.schools?.length) return row;
  const { data, error } = await client.from("cfb_teams")
    .select("display_name, abbreviation, primary_color, logo_url, logo_dark_url").limit(1000);
  if (error || !data) return row;
  const primary = matchSchoolBrand(row.school || row.school_info?.name || "", data);
  return {
    ...row,
    school_info: primary ?? row.school_info,
    schools: (row.schools ?? []).map(team => {
      const brand = matchSchoolBrand(team.label, data);
      return brand ? { label: brand.abbr, color: brand.primaryColor, logo: brand.logoUrl || team.logo } : team;
    }),
  } as T;
}
