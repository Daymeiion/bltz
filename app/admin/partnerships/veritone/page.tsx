import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PilotNavigation from "./PilotNavigation";
import styles from "../partnerships.module.css";

export const metadata: Metadata = { title: "Veritone Pilot One-Sheet | BLTZ Admin" };

export default function VeritonePilotPage() {
  return (
    <div className={styles.workspace}>
      <PilotNavigation current="one-sheet" />
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Veritone × BLTZ / Proposed pilot one-sheet</p>
        <h1>Bring archive footage back into the athlete’s story</h1>
        <p className={styles.lede}>Test whether connecting rights-approved sports footage to verified athlete career Moments makes it easier to rediscover the footage and request a license through Veritone.</p>
      </header>
      <dl className={styles.scope} aria-label="Proposed pilot scope">
        <div><dt>Archive</dt><dd>One college sports collection</dd></div>
        <div><dt>Cohort</dt><dd>3–5 athlete Lockers</dd></div>
        <div><dt>Footage</dt><dd>10–15 candidate clips</dd></div>
        <div><dt>Duration</dt><dd>Six weeks from kickoff</dd></div>
      </dl>
      <div className={styles.roles}>
        <section>
          <h2>Veritone supplies the footage and licensing path</h2>
          <p>Shortlist clips from one eligible collection. Provide source IDs, credits, allowed preview formats and uses, and a licensing contact or destination. Coordinate any required approvals with the rights holder.</p>
        </section>
        <section>
          <h2>BLTZ connects clips to athlete Moments</h2>
          <p>Identify the athlete, game, and Moment for each match. Build a private Locker demo with approved references, visible source credits, and a clear handoff to Veritone for licensing requests.</p>
        </section>
      </div>
      <section className={styles.callout}>
        <h2>What we’ll decide together</h2>
        <p>At kickoff, agree on the archive, cohort, intended audience, allowed display format, and one lead per team. At the readout, review match accuracy, clearance turnaround, and whether users can complete the handoff. Decide whether to expand, revise, or close the pilot.</p>
      </section>
      <footer>
        <Link href="/admin/partnerships/veritone/workflow" className={styles.next}>Open media workflow &amp; timeline <ArrowRight size={18} aria-hidden="true" /></Link>
      </footer>
    </div>
  );
}
