import { z } from "zod";

/** Date-only values must survive save/reload without timezone conversion. */
export const birthdateSchema = z.iso.date().refine(value => value >= "1850-01-01" && value <= new Date().toISOString().slice(0, 10), "Enter a valid birthdate that is not in the future.");
export const highSchoolSchema = z.string().trim().min(1).max(160).regex(/^[^\u0000-\u001f\u007f]*$/, "High school must not contain control characters.");
