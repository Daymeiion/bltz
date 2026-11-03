export const SCHOOL_IDENTITY_SOURCE_AUDIT = {
  schools: {
    canonicalKey: "public.schools.id (uuid)",
    organizationLink: "public.organizations.school_id",
    typedColors: false,
    colorStorage: "untyped public.schools.meta is not approved",
    exactDirectoryLink: false,
  },
  colleges: {
    canonicalKey: "public.\"Colleges\".id (bigint)",
    typedColors: true,
    colorColumns: ["primary_color_hex", "secondary_color_hex"],
    exactSchoolLink: false,
  },
  cfbTeams: {
    canonicalKey: "public.cfb_teams.espn_id (text)",
    typedColors: true,
    colorColumns: ["primary_color", "alt_color"],
    exactSchoolLink: false,
  },
  repositoryCoverage: {
    rowLevelExportPresent: false,
    conclusion: "schema confirms candidate sources but cannot prove row coverage or identity uniqueness",
  },
} as const;
