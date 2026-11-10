import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { openInvite } from "@/lib/enterprise-crm/pilot/invites";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Claim your BLTZ Locker", robots: { index: false, follow: false } };

/** Where a player lands from a school's invite: who invited them and one button to claim their Locker. */
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await openInvite(token);
  return (
    <main className="pilot-public">
      <div className="pilot-public__card pilot-public__card--narrow">
        <span className="pilot-public__brand"><Image src="/images/bltz-mark.svg" alt="" width={32} height={32} priority /><strong>BLTZ</strong></span>
        {!invite ? (
          <>
            <h1>This invite is no longer available</h1>
            <p className="pilot-public__lede">The link has expired or was turned off. Ask the school that sent it for a new one.</p>
          </>
        ) : invite.claimed ? (
          <>
            <h1>This Locker is already claimed</h1>
            <p className="pilot-public__lede">{invite.athleteName}&apos;s Locker has an owner. If that is you, sign in to manage it.</p>
            <Link className="pilot-pill pilot-pill--primary" href="/auth/login?next=/dashboard">Sign in</Link>
          </>
        ) : (
          <>
            <p className="pilot-public__eyebrow">{invite.organizationName} invited you</p>
            <h1>{invite.athleteName}, claim your Locker</h1>
            <p className="pilot-public__lede">Your Locker is a page for your career: stats, photos and video that fans can visit. {invite.organizationName} uses BLTZ to celebrate its former players, and yours is waiting. You decide what is on it.</p>
            <form method="post" action={`/join/${token}/start`}>
              <button type="submit" className="pilot-pill pilot-pill--primary">Claim your Locker</button>
            </form>
            <p className="pilot-public__note">You will create a BLTZ account (or sign in), then review your Locker before it goes live. Not {invite.athleteName}? You can close this page.</p>
          </>
        )}
      </div>
    </main>
  );
}
