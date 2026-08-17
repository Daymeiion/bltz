import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/rbac";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();

  // Check if user is admin
  if (!profile || profile.role !== "admin") {
    redirect("/auth/admin?error=not_admin");
  }

  return (
    <div className="flex min-h-screen w-full bg-black overflow-x-hidden">
      <AdminSidebar />
      <main className="flex-1 md:pt-0 pt-16 min-w-0">
        {children}
      </main>
    </div>
  );
}
