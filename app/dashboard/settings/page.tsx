import { Suspense } from "react";
import { SettingsClient } from "./settings-client";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Settings | BLTZ Dashboard",
  description: "Manage your profile and account settings",
};

function SettingsPageSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[hsl(var(--bltz-navy))] via-[#000000] to-[#000000]">
      <Loader2 className="h-12 w-12 animate-spin text-bltz-gold" />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <SettingsClient />
    </Suspense>
  );
}
