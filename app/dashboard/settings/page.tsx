import { redirect } from "next/navigation";
import SettingsClient from "./settings-client";
import { getCurrentUserProfile } from "@/lib/rbac";

export default async function SettingsPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect("/auth/login");
  }

  return <SettingsClient />;
}
