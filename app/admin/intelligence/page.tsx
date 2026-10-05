import { redirect } from "next/navigation";
import { IntelligenceAccessError } from "@/lib/intelligence/lab-server";
import { loadIntelligenceWorkspace } from "@/lib/intelligence/workspace-server";
import { loadIntelligenceResearch } from "@/lib/intelligence/research-server";
import { CareerWorkspace } from "./CareerWorkspace";
import { ResearchView } from "./ResearchView";
import { IntelligenceWorkspace } from "./Workspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "BLTZ Intelligence Lab", robots: { index: false, follow: false } };

export default async function IntelligenceLabPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; athlete?: string; asOf?: string; moment?: string }> }) {
  const params = await searchParams;
  const clean = { q: typeof params.q === "string" ? params.q : undefined, athlete: typeof params.athlete === "string" ? params.athlete : undefined, asOf: typeof params.asOf === "string" ? params.asOf : undefined };
  const content = await (async () => {
    if (params.view === "findings") return <IntelligenceWorkspace view="findings" context={clean}><ResearchView data={await loadIntelligenceResearch()} /></IntelligenceWorkspace>;
    return <CareerWorkspace initial={await loadIntelligenceWorkspace(clean)} initialMomentId={typeof params.moment === "string" ? params.moment : null} />;
  })().catch(error => {
    if (error instanceof IntelligenceAccessError && (error.status === 401 || error.status === 403)) redirect("/auth/admin?error=not_admin");
    return null;
  });
  return content ?? <section className="mx-auto max-w-3xl p-8" aria-label="Intelligence unavailable"><h1 className="text-2xl font-semibold">Intelligence Lab</h1><p role="alert" className="mt-3">Intelligence data is temporarily unavailable. Please try reloading.</p></section>;
}
