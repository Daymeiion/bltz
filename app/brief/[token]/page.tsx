import type { Metadata } from "next";
import { BriefDocument } from "@/components/organization/pilot/BriefDocument";
import { PrintBrief } from "@/components/organization/pilot/PrintBrief";
import { openBrief } from "@/lib/enterprise-crm/pilot/briefs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Partnership brief", robots: { index: false, follow: false } };

/** A partnership brief shared by a school. Public by private link; each open is counted. */
export default async function SharedBriefPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const content = await openBrief(token);
  return (
    <main className="brief-page">
      {content ? (
        <>
          <div className="brief-page__bar"><PrintBrief /></div>
          <BriefDocument content={content} />
        </>
      ) : (
        <div className="brief-page__gone">
          <h1>This brief is no longer available</h1>
          <p>The link has expired or was turned off. Ask the school that sent it for a new one.</p>
        </div>
      )}
    </main>
  );
}
