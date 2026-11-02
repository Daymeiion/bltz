import "server-only";

const BLTZ_DEFAULT = {
  accent: "#2952ff",
  highlight: "#d6a500",
} as const;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ExactSchoolIdentityRecord {
  schoolId: string;
  directoryRecordId: string;
  linkEvidence: "approved_typed_link";
  linkVersion: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
}

export type ExactSchoolIdentityResult =
  | { kind: "exact"; record: ExactSchoolIdentityRecord }
  | { kind: "missing" }
  | { kind: "ambiguous" }
  | { kind: "unsafe" };

/** Implementations may use only the future user-approved typed directory link. */
export interface ExactSchoolThemeAdapter {
  resolveExactIdentity(schoolId: string): Promise<ExactSchoolIdentityResult>;
}

export type ResolvedEnterpriseTheme =
  | {
      mode: "bltz";
      accent: typeof BLTZ_DEFAULT.accent;
      highlight: typeof BLTZ_DEFAULT.highlight;
      logoUrl: null;
      identityVersion: "bltz-default";
    }
  | {
      mode: "school";
      accent: string;
      highlight: string;
      logoUrl: string | null;
      identityVersion: string;
      directoryRecordId: string;
    };

function defaultTheme(): ResolvedEnterpriseTheme {
  return {
    mode: "bltz",
    accent: BLTZ_DEFAULT.accent,
    highlight: BLTZ_DEFAULT.highlight,
    logoUrl: null,
    identityVersion: "bltz-default",
  };
}

function toRgb(color: string): [number, number, number] | null {
  if (!HEX_COLOR.test(color)) return null;
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
}

function relativeLuminance(color: string): number | null {
  const rgb = toRgb(color);
  if (!rgb) return null;
  const channels = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function colorContrast(left: string, right: string): number | null {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  if (leftLuminance === null || rightLuminance === null) return null;
  const lighter = Math.max(leftLuminance, rightLuminance);
  const darker = Math.min(leftLuminance, rightLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function safeIdentity(record: ExactSchoolIdentityRecord, schoolId: string): boolean {
  const accentContrast = colorContrast(record.primaryColor, "#ffffff");
  const highlightContrast = colorContrast(record.secondaryColor, "#171a21");
  return record.schoolId === schoolId &&
    record.linkEvidence === "approved_typed_link" &&
    record.directoryRecordId.trim().length > 0 &&
    record.linkVersion.trim().length > 0 &&
    safeLogoUrl(record.logoUrl) &&
    accentContrast !== null &&
    accentContrast >= 3 &&
    highlightContrast !== null &&
    highlightContrast >= 3;
}

function safeLogoUrl(value: string | null): boolean {
  if (value === null) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** Missing, ambiguous, mismatched, or unsafe identity always returns BLTZ Default. */
export async function resolveEnterpriseSchoolTheme(input: {
  schoolId: string | null;
  adapter: ExactSchoolThemeAdapter;
}): Promise<ResolvedEnterpriseTheme> {
  if (!input.schoolId || !UUID_PATTERN.test(input.schoolId)) return defaultTheme();
  const result = await input.adapter.resolveExactIdentity(input.schoolId);
  if (result.kind !== "exact" || !safeIdentity(result.record, input.schoolId)) {
    return defaultTheme();
  }

  return {
    mode: "school",
    accent: result.record.primaryColor.toLowerCase(),
    highlight: result.record.secondaryColor.toLowerCase(),
    logoUrl: result.record.logoUrl,
    identityVersion: result.record.linkVersion,
    directoryRecordId: result.record.directoryRecordId,
  };
}
