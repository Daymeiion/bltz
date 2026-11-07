import type { Metadata } from "next";
import { AthleteLanding } from "@/components/redesign/AthleteLanding";

export const metadata: Metadata = {
  title: "Put your name on it | BLTZ (redesign preview)",
  description: "Claim your Player Locker: one page for your film, stats, photos, interviews and press.",
};

export default function RedesignAthletesPage() {
  return <AthleteLanding />;
}
