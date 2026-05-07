import type { ReactNode } from "react";
import { BroadcastShell } from "@/components/onboarding/BroadcastShell";

export const metadata = {
  title: "Claim your locker | BLTZ",
  description: "Build your career locker on BLTZ in three steps.",
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <BroadcastShell>{children}</BroadcastShell>;
}
