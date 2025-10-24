// types/awards.ts
import { z } from "zod";

export const SourceSchema = z.object({
  site: z.string().min(1),               // e.g., "Wikipedia"
  url: z.string().url(),
  accessed_at: z.string().datetime().optional(), // ISO timestamp
});

export const PlayerAwardSchema = z.object({
  player_id: z.string().min(1),          // your internal id
  player_name: z.string().min(1),        // useful for QA/dedup
  award_name: z.string().min(1),         // e.g., "Consensus All-American"
  award_short_desc: z.string().min(3).max(300),
  year: z.union([z.number().int().gte(1900).lte(2100), z.string()]), // allow ranges
  level: z.enum(["HS","College","Pro"]).optional(),
  team_or_school: z.string().optional(), // "Oregon", "New England Patriots"
  league: z.string().optional(),         // "NCAA", "NFL", "Pac-12"
  source: SourceSchema,
  evidence_quote: z.string().optional(), // short supporting excerpt
  extractor_confidence: z.number().min(0).max(1).optional(),
  extractor_version: z.string().optional(), // e.g., "blitzy-2@2025-10-23"
});

export type PlayerAward = z.infer<typeof PlayerAwardSchema>;
