import { notFound, redirect } from "next/navigation";
import { authorizeIntelligenceLab, IntelligenceAccessError } from "@/lib/intelligence/lab-server";
import { buildSyntheticWorkflowExamples } from "@/lib/intelligence/features/examples";
import { SyntheticExamples } from "./SyntheticExamples";

export const dynamic = "force-dynamic";
export const metadata = { title: "Synthetic examples · BLTZ Intelligence Lab", robots: { index: false, follow: false } };

/** Examples never read product records or publish synthetic events to a live store. */
export default async function SyntheticExamplesPage() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") notFound();
  try {
    await authorizeIntelligenceLab();
  } catch (error) {
    if (error instanceof IntelligenceAccessError && (error.status === 401 || error.status === 403)) redirect("/auth/admin?error=not_admin");
    return <section className="mx-auto max-w-3xl p-8" aria-label="Synthetic examples unavailable"><h1 className="text-2xl font-semibold">Synthetic workflow examples</h1><p role="alert" className="mt-3">Admin authorization is temporarily unavailable. No examples have been loaded.</p></section>;
  }
  return <SyntheticExamples examples={buildSyntheticWorkflowExamples()} />;
}
