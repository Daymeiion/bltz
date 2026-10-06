import { NextResponse } from "next/server";
import medallion from "@/public/images/Awards/all-american-medallion-illustration.png";

/** Stable reference URL; importing the image includes it in the deployed build. */
export function GET(request: Request) {
  return NextResponse.redirect(new URL(medallion.src, request.url), 307);
}
