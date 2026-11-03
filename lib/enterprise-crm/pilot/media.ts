import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { gettyAssetFromLink } from "@/lib/getty/link";
import { createServiceClient } from "@/lib/supabase/service";

export const ATHLETE_MEDIA_BUCKET = "organization-athlete-media";

/** Accepted upload types and their size caps (the bucket enforces the same list). */
export const UPLOAD_TYPES = {
  "video/mp4": { ext: "mp4", max: 250 * 1024 * 1024, kind: "highlight" },
  "video/webm": { ext: "webm", max: 250 * 1024 * 1024, kind: "highlight" },
  "video/quicktime": { ext: "mov", max: 250 * 1024 * 1024, kind: "highlight" },
  "image/jpeg": { ext: "jpg", max: 15 * 1024 * 1024, kind: "image" },
  "image/png": { ext: "png", max: 15 * 1024 * 1024, kind: "image" },
  "image/webp": { ext: "webp", max: 15 * 1024 * 1024, kind: "image" },
} as const;
export type UploadMime = keyof typeof UPLOAD_TYPES;

export const uploadTicketInput = z.object({
  playerId: z.string().uuid(),
  mime: z.enum(Object.keys(UPLOAD_TYPES) as [UploadMime, ...UploadMime[]]),
  size: z.number().int().positive(),
}).strict().refine((input) => input.size <= UPLOAD_TYPES[input.mime].max, { message: "too_large", path: ["size"] });

/** A one-time signed link the browser uploads straight to private storage. */
export async function createUploadTicket(organizationId: string, input: z.infer<typeof uploadTicketInput>) {
  const path = `${organizationId}/${input.playerId}/${randomUUID()}.${UPLOAD_TYPES[input.mime].ext}`;
  const { data, error } = await createServiceClient().storage.from(ATHLETE_MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data?.token) throw new Error("upload_unavailable");
  return { bucket: ATHLETE_MEDIA_BUCKET, path, token: data.token };
}

const STORAGE_PATH = /^([0-9a-f-]{36})\/([0-9a-f-]{36})\/[0-9a-f-]{36}\.(mp4|webm|mov|jpg|png|webp)$/;

/** An upload counts only if it sits under this school and player and actually landed in storage. */
export async function verifyUpload(organizationId: string, playerId: string, storagePath: string): Promise<boolean> {
  const match = STORAGE_PATH.exec(storagePath);
  if (!match || match[1] !== organizationId || match[2] !== playerId) return false;
  const folder = `${match[1]}/${match[2]}`;
  const file = storagePath.slice(folder.length + 1);
  const { data, error } = await createServiceClient().storage.from(ATHLETE_MEDIA_BUCKET).list(folder, { search: file, limit: 2 });
  return !error && Array.isArray(data) && data.some((row) => row.name === file);
}

/** Getty items must point at the gettyimages.com detail page for the same asset. */
export function validGettyItem(url: string | null | undefined, externalId: string | null | undefined): boolean {
  if (!url || !externalId || !/^[0-9A-Za-z-]{1,40}$/.test(externalId)) return false;
  return url === `https://www.gettyimages.com/detail/${externalId}` || gettyAssetFromLink(url)?.id === externalId;
}
