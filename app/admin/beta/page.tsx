import { redirect } from "next/navigation";
import { ADMIN_DEFAULT_PATH } from "@/lib/auth/redirects";

/** Keep existing bookmarks working after consolidating preview tracking in GTM. */
export default function BetaIntelligencePage() {
  redirect(ADMIN_DEFAULT_PATH);
}
