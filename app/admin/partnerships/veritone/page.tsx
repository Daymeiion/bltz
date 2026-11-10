import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getVeritonePilotBrief } from "./brief";
import PilotNavigation from "./PilotNavigation";
import styles from "../partnerships.module.css";

export const metadata: Metadata = { title: "Veritone Pilot One-Sheet | BLTZ Admin" };

export default async function VeritonePilotPage() {
  const brief = await getVeritonePilotBrief();

  return (
    <div className={styles.workspace}>
      <PilotNavigation current="one-sheet" />
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Veritone × BLTZ / Proposed pilot one-sheet</p>
        <h1>Archives to athlete Lockers</h1>
        <p className={styles.lede}>{brief?.summary ?? "Test whether athlete career pages can help fans rediscover historical sports footage and find a licensing path."}</p>
      </header>
      {brief ? (
        <>
          <dl className={styles.scope} aria-label="Proposed pilot scope">
            <div><dt>Archive</dt><dd>{brief.archive}</dd></div>
            <div><dt>Cohort</dt><dd>{brief.cohort}</dd></div>
            <div><dt>Preferred partner</dt><dd>{brief.preferredPartner}</dd></div>
            <div><dt>Pilot window</dt><dd>{brief.duration}</dd></div>
          </dl>
          <section className={styles.callout}>
            <p className={styles.eyebrow}>Proposed proof point</p>
            <h2>{brief.proofTitle}</h2>
            <p>{brief.proofDetails}</p>
            <p>{brief.proofRights}</p>
          </section>
        </>
      ) : (
        <p className={styles.copy}>The meeting brief is unavailable in this environment.</p>
      )}
      <div className={styles.roles}>
        <section>
          <h2>Veritone supplies the footage and licensing path</h2>
          <p>Confirm archive coverage and approved search access. Share candidate references, rights status, source credits, and a licensing destination. Coordinate any required rights-holder approvals.</p>
        </section>
        <section>
          <h2>BLTZ connects clips to athlete Moments</h2>
          <p>Match footage to athlete Career IDs and Moments, confirm athlete participation, and activate the agreed media in Lockers when permissions allow. Track engagement and attributable licensing referrals.</p>
        </section>
      </div>
      <section className={styles.callout}>
        <h2>Joint hypothesis</h2>
        <p>Athlete-led discovery can surface demand that traditional archive search misses. Measure Locker engagement and licensing referrals to decide whether to expand to another cohort.</p>
      </section>
      <footer>
        <Link href="/admin/partnerships/veritone/workflow" className={styles.next}>Open media workflow &amp; timeline <ArrowRight size={18} aria-hidden="true" /></Link>
      </footer>
    </div>
  );
}
