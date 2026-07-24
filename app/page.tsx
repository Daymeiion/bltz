import type { Metadata } from "next";
import { LandingJourney } from "@/components/landing/LandingJourney";

export const metadata: Metadata = {
  title: "Claim Your Player Locker | BLTZ",
  description:
    "Bring every highlight, story, interview, photo, and career milestone into one Player Locker.",
};

export default function Home() {
  return <LandingJourney />;
}
