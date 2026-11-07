import type { Metadata } from "next";
import { AthleteHeroPage } from "@/components/redesign/AthleteLanding";
import { LiveRoutes } from "@/components/redesign/SiteChrome";
import { redesignFontClasses } from "./redesign/fonts";

export const metadata: Metadata = {
  title: "Claim Your Player Locker | BLTZ",
  description:
    "BLTZ gives you a Player Locker: one page for your film, stats, photos, interviews and press, with your name on the door.",
};

// The previous homepage (components/landing/LandingJourney) is kept in the
// codebase but no longer routed. The full redesign is in progress at /redesign.
export default function Home() {
  return (
    <div data-redesign className={redesignFontClasses}>
      <LiveRoutes>
        <AthleteHeroPage />
      </LiveRoutes>
    </div>
  );
}
