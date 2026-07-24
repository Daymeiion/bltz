import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const waitlistSchema = z.object({
  email: z.string().trim().email().max(254),
  fullName: z.string().trim().max(120).optional().or(z.literal("")),
  sport: z.string().trim().max(80).optional().or(z.literal("")),
  school: z.string().trim().max(120).optional().or(z.literal("")),
  playingLevel: z.enum(["hs", "cfb", "pro", "former"]).optional().or(z.literal("")),
  contentGap: z.string().trim().max(500).optional().or(z.literal("")),
  newsletterOptIn: z.boolean().optional(),
  website: z.string().max(0).optional().or(z.literal("")),
});

function optionalText(value: string | undefined) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = waitlistSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the form and try again." }, { status: 400 });
  }

  const body = parsed.data;
  const email = body.email.toLowerCase();

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("landing_waitlist")
      .upsert(
        {
          email,
          full_name: optionalText(body.fullName),
          sport: optionalText(body.sport),
          school: optionalText(body.school),
          playing_level: body.playingLevel || null,
          current_content_gap: optionalText(body.contentGap),
          newsletter_opt_in: body.newsletterOptIn ?? true,
          source: "claim_locker_landing",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );

    if (error) {
      console.error("waitlist insert failed", error);
      return NextResponse.json({ error: "Unable to join the waitlist right now." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("waitlist service unavailable", error);
    return NextResponse.json({ error: "Waitlist is not configured yet." }, { status: 503 });
  }
}
