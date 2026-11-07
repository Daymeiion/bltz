import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

// Demo requests from the enterprise landing page. Short term these are saved in
// the existing landing_waitlist table with source "enterprise_demo", so no
// migration is needed: school holds the organization and current_content_gap
// holds the organization type, role and message.
const demoRequestSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  organization: z.string().trim().min(1).max(120),
  organizationType: z.enum(["athletic_department", "nil_collective", "other"]),
  role: z.string().trim().max(80).optional().or(z.literal("")),
  message: z.string().trim().max(300).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")),
});

const typeLabels = {
  athletic_department: "Athletic department",
  nil_collective: "NIL collective",
  other: "Other",
} as const;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = demoRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the form and try again." }, { status: 400 });
  }

  const body = parsed.data;
  const details = [
    `Type: ${typeLabels[body.organizationType]}`,
    body.role ? `Role: ${body.role}` : null,
    body.message ? `Message: ${body.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("landing_waitlist").upsert(
      {
        email: body.email.toLowerCase(),
        full_name: body.fullName,
        school: body.organization,
        current_content_gap: details,
        newsletter_opt_in: false,
        source: "enterprise_demo",
        status: "new",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );

    if (error) {
      console.error("demo request insert failed", error);
      return NextResponse.json({ error: "We couldn't send your request right now. Try again in a minute." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("demo request service unavailable", error);
    return NextResponse.json({ error: "Demo requests aren't set up yet. Use the calendar link instead." }, { status: 503 });
  }
}
