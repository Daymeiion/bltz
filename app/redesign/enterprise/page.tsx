import type { Metadata } from "next";
import { EnterpriseLanding } from "@/components/redesign/EnterpriseLanding";

export const metadata: Metadata = {
  title: "BLTZ for programs and collectives (redesign preview)",
  description: "A Player Locker for every athlete on your roster, with approvals and reporting for your staff.",
};

export default function RedesignEnterprisePage() {
  return <EnterpriseLanding />;
}
