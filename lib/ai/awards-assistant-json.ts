import OpenAI from "openai";
import type { PlayerAward, AwardDiscoveryResult } from "./award-discovery";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type StructuredAward = {
  name: string;
  description: string;
  organization: string;
  date?: string; // ISO or free-text date; we'll normalize to year
  year?: number;
  category?: "sports" | "academic" | "personal" | "professional";
  significance?: "local" | "regional" | "national" | "international";
  source_url: string; // required for reliability
  image_url?: string;
};

type StructuredResponse = {
  player_name: string;
  awards: StructuredAward[];
  notes?: string;
};

function normalizeYear(input?: string | number): number | undefined {
  if (typeof input === "number") return input;
  if (!input) return undefined;
  const match = String(input).match(/(19|20)\d{2}/);
  return match ? parseInt(match[0], 10) : undefined;
}

function normalizeSourceUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  let s = String(raw).trim();
  // Handle markdown links: [text](url)
  const md = s.match(/\((https?:\/\/[^)\s]+)\)/i);
  if (md) s = md[1];
  // Extract first http(s) URL if text contains extras
  const urlMatch = s.match(/https?:\/\/[^\s)]+/i);
  if (urlMatch) s = urlMatch[0];
  // Trim trailing punctuation
  s = s.replace(/[).,;:]+$/g, "");
  try {
    const u = new URL(s);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    /* ignore */
  }
  return undefined;
}

function toPlayerAwards(data: StructuredResponse): PlayerAward[] {
  const seen = new Set<string>();
  const list: PlayerAward[] = [];
  for (const a of data.awards || []) {
    const year = normalizeYear(a.year ?? a.date);
    const sourceUrl = normalizeSourceUrl(a.source_url);
    const key = `${a.name?.toLowerCase().trim()}__${year ?? ""}`;
    if (!a.name || !a.description || !a.organization || !sourceUrl) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({
      id: `award_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      name: a.name.trim(),
      description: a.description.trim(),
      category: a.category ?? "sports",
      year: year ?? new Date().getFullYear(),
      organization: a.organization.trim(),
      image_url: a.image_url,
      source_url: sourceUrl,
      significance: a.significance ?? "regional",
      verified: true,
    });
  }
  return list;
}

export async function discoverPlayerAwardsStructured(
  playerName: string,
  sport: string,
  college?: string,
  team?: string
): Promise<AwardDiscoveryResult> {
  const schema = {
    name: "award_results",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        player_name: { type: "string" },
        awards: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "description", "organization", "source_url"],
            properties: {
              // Keep names concise; discourage sentence-like content
              name: {
                type: "string",
                minLength: 3,
                maxLength: 140,
                description:
                  "Official award title ONLY. Examples: 'First-Team All-American', 'AFC Defensive Player of the Week', 'Pac-10 Defensive Player of the Year'. Must be a title, NOT a sentence or description.",
              },
              description: { 
                type: "string", 
                minLength: 10, 
                maxLength: 800,
                description: "Detailed description explaining when the award was won, the player's performance, and why they received it. This should be a complete sentence or paragraph, NOT just the award title."
              },
              organization: { 
                type: "string", 
                minLength: 2, 
                maxLength: 200,
                description: "Official organization that issued the award (e.g., 'Pac-10 Conference', 'NFL', 'Associated Press', 'University of California Berkeley')"
              },
              date: { type: "string" },
              year: { type: "integer", minimum: 1900, maximum: 2100 },
              category: {
                type: "string",
                enum: ["sports", "academic", "personal", "professional"],
              },
              significance: {
                type: "string",
                enum: ["local", "regional", "national", "international"],
              },
              source_url: { 
                type: "string", 
                pattern: "^https?://",
                description: "Direct URL to official source verifying this award (team site, news article, sports database, league announcement). Must be a real, working URL."
              },
              image_url: { 
                type: "string",
                description: "Optional: Direct URL to an image of the player from that season, award ceremony photo, or official team photo. Must be a direct image link if provided."
              },
            },
          },
        },
        notes: { type: "string" },
      },
      required: ["player_name", "awards"],
    },
    strict: true,
  } as const;

  const system = `You are an expert sports research analyst with access to comprehensive sports databases and news archives.

Your task is to find VERIFIED, REAL awards with reliable sources. You MUST:
1. Search multiple reliable sources: official team sites, NCAA, NFL.com, ESPN, sports-reference.com, school athletic sites
2. Only return awards you can verify with a working URL source
3. Cross-reference information across multiple sources when possible
4. Include the most specific, authoritative source URL available
5. Never fabricate or guess - if you cannot verify an award with a source, omit it

Award name requirements:
- Must be concise title format (e.g., "First-Team All-American", "Pac-10 Defensive Player of the Year")
- NOT descriptions or sentences
- Use official award names from the source

Source URL requirements:
- Must link to official announcements, team rosters, news articles, or sports databases
- Prefer: official team sites > league sites > major sports news > sports databases
- Must be publicly accessible
- Include archived links if current page is unavailable

For image URLs:
- Search for official photos from the source URL's site
- Look for team photos, award ceremony photos, or player headshots from that season
- Only include if you find a direct image link`;

  const user = `Research and verify awards for: ${playerName}
Sport: ${sport}
${college ? `College/University: ${college}` : ""}
${team ? `Professional team(s): ${team} (also check Indianapolis Colts, San Diego Chargers)` : ""}

Search for these award types:
1. COLLEGE AWARDS:
   - All-American selections (consensus, first-team, second-team)
   - All-Conference selections (Pac-10, Pac-12, Big Ten, etc.)
   - Conference Player/Defensive Player/Offensive Player of the Year
   - Academic All-American
   - Specific positional awards
   - Team MVP, Team Captain

2. PROFESSIONAL AWARDS:
   - AFC/NFC Player/Defensive Player/Offensive Player of the Week/Month
   - Pro Bowl selections
   - All-Pro teams
   - Defensive Player of the Year
   - Rookie of the Year
   - Team awards

3. CHAMPIONSHIPS & POST-SEASON:
   - Bowl game appearances and awards
   - Conference championships
   - National championships
   - Playoff appearances

Search strategy:
- Check official ${college || "university"} athletic site and sports archives
- Check NFL team sites for ${team || "Indianapolis Colts and San Diego Chargers"}
- Search ESPN, Sports-Reference, official league sites
- Look for year-specific rosters and award announcements

CRITICAL: Each award MUST have:
- Exact official award name (not a description)
- Clear description of what the award recognizes and when it was received
- Year it was awarded
- Issuing organization
- Valid source_url to verify the award
- Optional: image_url if found on the source site

Example of GOOD output:
{
  "name": "First-Team All-Pac-10",
  "description": "Selected to the First-Team All-Pac-10 for exceptional defensive performance during the 2008 season at California",
  "organization": "Pac-10 Conference",
  "year": 2008,
  "source_url": "https://calbears.com/sports/football/roster/...",
  "category": "sports",
  "significance": "national"
}

Example of BAD output (DO NOT DO THIS):
{
  "name": "Selected to the First-Team All-Pac-10 for exceptional defensive performance during the 2008 season",
  "description": "First-Team All-Pac-10"
}

CRITICAL FIELD REQUIREMENTS:
- "name": SHORT title (2-8 words max) - "First-Team All-Pac-10", NOT a sentence
- "description": LONG explanation (1-3 sentences) - explains WHEN and WHY the award was won
- DO NOT put the description in the name field
- DO NOT put the name in the description field

Return only verified awards with sources. Quality over quantity.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.1, // Lower temperature for more consistent, factual results
    max_tokens: 4000, // Allow for comprehensive research
    response_format: { type: "json_schema", json_schema: schema },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  console.log("🔍 Raw AI response:", content.substring(0, 500));
  
  const parsed: StructuredResponse = JSON.parse(content);
  console.log(`📊 AI returned ${parsed.awards?.length || 0} raw awards`);
  
  // Log first few awards for debugging
  parsed.awards?.slice(0, 3).forEach((a, i) => {
    console.log(`Award ${i + 1}:`);
    console.log(`  Name: "${a.name}"`);
    console.log(`  Desc: "${a.description?.substring(0, 80)}..."`);
    console.log(`  Year: ${a.year}`);
  });
  
  const awards = repairAwardNames(toPlayerAwards(parsed));
  console.log(`✅ After processing: ${awards.length} valid awards`);

  // Build search terms for telemetry/debug
  const search_terms = [
    `${playerName} ${sport} awards`,
    `${playerName} ${sport} honors`,
    `${playerName} ${college ?? ""} awards`,
    `${playerName} ${team ?? ""} awards`,
  ].filter(Boolean) as string[];

  return {
    awards,
    player_name: playerName,
    search_terms,
    confidence_score: awards.length >= 5 ? 0.9 : awards.length >= 3 ? 0.75 : awards.length > 0 ? 0.6 : 0.0,
  };
}

// --- Name repair utilities ---

const DESCRIPTION_CUES = /\b(recognizes|honors|awarded|given|for\b|who\b|which\b|players?\b|season\b)\b/i;

function looksLikeDescription(text: string): boolean {
  if (!text) return false;
  if (text.length > 120) return true; // too long for a title
  if (/[.!?]$/.test(text)) return true; // sentence ending
  if (DESCRIPTION_CUES.test(text)) return true;
  return false;
}

// Try to extract a compact title from a longer sentence/description
function extractTitleFrom(text: string): string | null {
  if (!text) return null;
  const candidates: RegExp[] = [
    /(First-?Team|Second-?Team|Third-?Team)\s+All-\w+(?:\s\w+)*/i,
    /All-\w+(?:\s\w+)*/i,
    /\b[A-Z]{2,4}\s+(Offensive|Defensive)\s+Player\s+of\s+the\s+Week\b/i,
    /\b(Offensive|Defensive)\s+Player\s+of\s+the\s+(Week|Month|Year)\b/i,
    /\bRookie\s+of\s+the\s+Year\b/i,
    /\bMVP\b/i,
    /\bChampion(?:ship)?\b.*\b(Title|Winner)?\b/i,
    /(Pac-\d+|Big\s?Ten|SEC|ACC|Big\s?12)[^,.]*Player\s+of\s+the\s+Year/i,
  ];
  for (const rx of candidates) {
    const m = text.match(rx);
    if (m) return m[0].replace(/\s+/g, " ").trim();
  }
  return null;
}

function repairAwardNames(list: PlayerAward[]): PlayerAward[] {
  return list.map((a) => {
    let name = (a.name || "").trim();
    let description = (a.description || "").trim();
    
    // Check if name and description are swapped
    const nameIsDesc = looksLikeDescription(name);
    const descIsTitle = !looksLikeDescription(description) && description.length < 80;
    
    // If name looks like description but description looks like a title, swap them
    if (nameIsDesc && descIsTitle) {
      console.log(`🔄 Swapping name/description for: "${name.substring(0, 50)}..."`);
      [name, description] = [description, name];
    } else if (nameIsDesc) {
      // Try to extract title from either field
      const candidate = extractTitleFrom(description) || extractTitleFrom(name);
      if (candidate && !looksLikeDescription(candidate)) {
        console.log(`🔧 Extracted title: "${candidate}" from "${name.substring(0, 50)}..."`);
        name = candidate;
      } else {
        // Last resort: compress to title-like phrase (first 6 words, no period)
        const compressed = name.replace(/[.!?].*$/, "").split(/\s+/).slice(0, 6).join(" ");
        console.log(`⚠️ Compressing long name: "${name.substring(0, 50)}..." -> "${compressed}"`);
        name = compressed;
      }
    }
    
    // Clean trailing punctuation and excessive spaces
    name = name.replace(/[\s·•]+/g, " ").replace(/[.,;:!?\-–—]+$/, "").trim();
    
    return { ...a, name, description };
  });
}


