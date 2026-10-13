import { nflTeamCode, nflTeamName } from "./locker-format";

/** Presentation only: keep school/city names, without nickname or mascot. */
export function schoolHistoryName(value: string, mascot?: string | null): string {
  let name = value.trim();
  if (mascot?.trim() && name.toLowerCase().endsWith(` ${mascot.trim().toLowerCase()}`)) {
    name = name.slice(0, -mascot.trim().length).trim();
  }
  return name.replace(/\s+(?:Orangemen|Orange|Golden Bears|Trojans|Bruins)$/i, "").trim();
}

export function proHistoryName(value: string): string {
  const code = nflTeamCode(value);
  if (!code) return value.trim();
  const historical: Record<string, string> = { SD: "San Diego", OAK: "Oakland", STL: "St. Louis" };
  return historical[code] ?? (nflTeamName(code) ?? value).replace(/\s+\S+$/, "");
}
