import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PilotApplyForm } from "@/components/organization/pilot/PilotApplyForm";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Apply for the BLTZ pilot", description: "Schools and NIL agencies: bring your former players' careers to life with BLTZ." };

async function collegeDirectory(): Promise<Array<{ id: number; name: string }>> {
  try {
    const rows: Array<{ id: number; canonical_name: string }> = [];
    const db = createServiceClient();
    for (let from = 0; from < 6000; from += 1000) {
      const { data } = await db.from("Colleges").select("id,canonical_name").order("canonical_name").range(from, from + 999);
      rows.push(...(data ?? []) as typeof rows);
      if (!data || data.length < 1000) break;
    }
    return rows.map((row) => ({ id: row.id, name: row.canonical_name }));
  } catch {
    return [];
  }
}

/** Public application page for the Enterprise CRM pilot. */
export default async function PilotApplyPage() {
  const supabase = await createClient();
  const [{ data }, colleges] = await Promise.all([supabase.auth.getUser(), collegeDirectory()]);
  return (
    <main className="pilot-public">
      <div className="pilot-public__card">
        <Link href="/enterprise" className="pilot-public__brand" aria-label="BLTZ for organizations">
          <Image src="/images/bltz-mark.svg" alt="" width={32} height={32} priority /><strong>BLTZ</strong>
        </Link>
        <h1>Apply for the pilot</h1>
        <p className="pilot-public__lede">For athletic departments and NIL agencies. BLTZ lists your former players, flags the dates worth celebrating, and gives each player a fan Locker.</p>
        <PilotApplyForm colleges={colleges} signedInEmail={data.user?.email ?? null} />
      </div>
    </main>
  );
}
