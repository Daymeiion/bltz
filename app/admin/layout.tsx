import { redirect } from "next/navigation";
import { getCurrentAuthorizationProfile } from "@/lib/rbac";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminThemeShell } from "@/components/admin/AdminThemeShell";
import "./admin-theme.css";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentAuthorizationProfile();

  if (!profile || profile.role !== "admin") {
    redirect("/auth/admin?error=not_admin");
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-[#f1f0ed] transition-colors duration-300 dark:bg-[#0b0c0e]">
      <AdminSidebar />
      <main className="min-w-0 flex-1 pt-16 md:pt-0">
        <AdminThemeShell>{children}</AdminThemeShell>
      </main>
    </div>
  );
}
