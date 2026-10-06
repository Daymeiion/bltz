// Shared presentation and identity aliases. Directory abbreviations remain authoritative.
// Explicit aliases are campus-specific; ambiguous codes such as USC, OSU and Miami
// are never expanded for identity matching without an unambiguous directory row.
const VERIFIED_SCHOOLS = [
  { name: "California", abbr: "CAL", aliases: ["Cal", "California Golden Bears", "UC Berkeley", "University of California, Berkeley", "University of California at Berkeley"] },
  { name: "UCLA", abbr: "UCLA", aliases: ["UCLA Bruins", "University of California, Los Angeles", "University of California at Los Angeles"] },
  { name: "Louisiana State", abbr: "LSU", aliases: ["LSU", "LSU Tigers", "Louisiana State University"] },
  { name: "Central Florida", abbr: "UCF", aliases: ["UCF", "UCF Knights", "University of Central Florida"] },
] as const;

export function schoolNameKey(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function knownSchool(value: string) {
  const key = schoolNameKey(value);
  return VERIFIED_SCHOOLS.find(school => [school.name, school.abbr, ...school.aliases].some(alias => schoolNameKey(alias) === key));
}

export function schoolAliases(value: string): string[] {
  const clean = value.trim();
  if (!clean) return [];
  const known = knownSchool(clean);
  if (known) return [...new Set([clean, known.name, known.abbr, ...known.aliases])];
  // Strip only institutional boilerplate, retaining campus/location distinctions.
  const simple = clean.replace(/^the\s+/i, "").replace(/^university\s+of\s+/i, "").replace(/\s+university$/i, "").trim();
  if (["miami", "california"].includes(schoolNameKey(simple)) && schoolNameKey(clean) !== schoolNameKey(simple)) return [clean];
  return [...new Set([clean, simple])];
}

export function schoolsMatch(left: string, right: string): boolean {
  const keys = new Set(schoolAliases(left).map(schoolNameKey).filter(Boolean));
  return schoolAliases(right).some(alias => Boolean(schoolNameKey(alias)) && keys.has(schoolNameKey(alias)));
}

export function schoolShortLabel(value: string, abbreviation?: string | null): string {
  if (abbreviation?.trim()) return abbreviation.trim().toUpperCase();
  const known = knownSchool(value);
  if (known) return known.abbr;
  const clean = value.trim();
  if (clean.length <= 5) return clean.toUpperCase();
  const initials = clean.split(/[^\p{L}\p{N}]+/u).filter(word => word && !/^(of|the|at|university)$/i.test(word)).map(word => word[0]).join("");
  // A display-only fallback, never an identity alias or inferred affiliation.
  return (initials.length > 1 ? initials.slice(0, 5) : clean.slice(0, 3)).toUpperCase();
}

export function schoolDisplayName(value: string): string {
  return knownSchool(value)?.name ?? value.trim();
}

// Phrase boundaries prevent short labels matching unrelated words. Bare California
// is accepted for Cal only when the metadata does not identify another campus.
export function mentionsSchool(text: string, school: string): boolean {
  const words = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const haystack = " " + words(text) + " ";
  const otherCalifornia = /\b(?:southern|northern|central|western|eastern) california\b|\bcalifornia (?:state|los angeles|at los angeles|davis|irvine|san diego|riverside|santa barbara|santa cruz|merced)\b/.test(haystack);
  return schoolAliases(school).some(alias => {
    const needle = words(alias);
    if (needle.length < 2) return false;
    if (knownSchool(school)?.abbr === "CAL" && needle === "california" && otherCalifornia) return false;
    if (knownSchool(school)?.abbr === "CAL" && needle === "cal" && /\bcal state\b/.test(haystack)) return false;
    return haystack.includes(" " + needle + " ");
  });
}
