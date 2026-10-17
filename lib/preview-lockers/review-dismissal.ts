import { z } from "zod";
import { previewUrl } from "./validation";
const revision = z.number().int().positive(), version = z.number().int().positive();
const urls = z.array(previewUrl).min(1).max(200).refine(values => new Set(values).size === values.length, "Choose each result once.");
export const reviewDismissalSchema = z.union([
  z.object({ revision, version, action: z.literal("restore"), url: previewUrl }).strict(),
  z.object({ revision, version, action: z.literal("restore"), urls }).strict(),
  z.object({ revision, version, url: previewUrl }).strict(),
  z.object({ revision, version, urls }).strict(),
]);
