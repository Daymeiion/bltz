import { notFound, redirect } from "next/navigation";
import { isInternalAdmin } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

/**
 * The school template (the fictional Cal preview) opens on the dev server for anyone
 * and in production for BLTZ admins only, so admins can keep editing it before any
 * school is enrolled. Everyone else gets a 404.
 */
export async function requireTemplateAccess(nextPath: string): Promise<void> {
  if (process.env.NODE_ENV === "development") return;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/auth/admin?next=${encodeURIComponent(nextPath)}`);
  if (!(await isInternalAdmin())) notFound();
}
