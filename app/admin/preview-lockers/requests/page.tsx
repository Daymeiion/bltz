import Link from "next/link";
import { previewAdmin } from "@/lib/preview-lockers/server";

export const dynamic = "force-dynamic";
export default async function PreviewRequests() {
  const { client } = await previewAdmin();
  const [responses, candidates] = await Promise.all([
    client.from("preview_conversion_responses").select("*").eq("state", "accepted").order("created_at", { ascending: false }).limit(200),
    client.from("preview_locker_candidates").select("*").order("created_at", { ascending: false }).limit(500),
  ]);
  if (responses.error || candidates.error) throw new Error("Locker requests unavailable. Check that the claim-request migration has been applied.");
  return <main className="mx-auto max-w-5xl space-y-6 p-6">
    <Link href="/admin/preview-lockers" className="underline">Back to preview lockers</Link>
    <h1 className="text-3xl font-semibold">Locker requests & referrals</h1>
    <p>Latest 200 requests and 500 referrals. Contact suggestions require Admin review; they do not indicate nominee consent or verified athlete identity.</p>
    {responses.data?.length ? responses.data.map(response => <section key={response.preview_id} className="space-y-3 rounded-xl border p-5">
      <h2 className="text-xl font-semibold"><Link className="underline" href={`/admin/preview-lockers/${response.preview_id}/edit`}>Originating Locker · {response.email}</Link></h2>
      <p>{response.dashboard_interest ? "Dashboard review meeting requested" : "Locker interest submitted"} · {new Date(response.created_at).toLocaleDateString("en-US", { timeZone: "UTC" })}</p>
      <p className="whitespace-pre-wrap">{response.feature_requests || "No feature requests provided."}</p>
      <ul className="space-y-3">{candidates.data?.filter(candidate => candidate.referrer_preview_id === response.preview_id).map(candidate => <li key={candidate.id} className="rounded border p-3">
        <strong>{candidate.full_name}</strong><p>{candidate.email || "No email"} · {candidate.phone || "No phone"}</p>
      </li>)}</ul>
    </section>) : <p>No Locker requests yet.</p>}
  </main>;
}
