import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/rbac";

const allowedOrigin = process.env.NODE_ENV === "development" ? "http://localhost:4173" : "";

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: allowedOrigin
      ? { "Access-Control-Allow-Origin": allowedOrigin, "Access-Control-Allow-Credentials": "true" }
      : undefined,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

export async function POST(request: Request) {
  const profile = await getCurrentUserProfile();
  if (!profile) return response({ error: "Unauthorized" }, 401);

  const payload = (await request.json().catch(() => null)) as { bio?: unknown } | null;
  const bio = typeof payload?.bio === "string" ? payload.bio.trim() : "";
  if (bio.length < 20 || bio.length > 4000) {
    return response({ error: "Bio must be between 20 and 4,000 characters." }, 400);
  }

  if (!process.env.OPENAI_API_KEY) {
    return response({ bio, mode: "original", message: "AI polishing is not configured yet." });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.responses.create({
      model: "gpt-5-mini",
      instructions:
        "Polish athlete biographies for a public sports profile. Preserve every factual claim, do not invent awards or statistics, use confident third-person editorial prose, and return only the revised biography.",
      input: bio,
    });
    return response({ bio: completion.output_text.trim(), mode: "ai" });
  } catch (error) {
    console.error("Bio polish failed", error);
    return response({ error: "Bio polishing is temporarily unavailable." }, 502);
  }
}
