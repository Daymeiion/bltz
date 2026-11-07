import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LegalBar } from "@/components/redesign/SiteChrome";
import styles from "@/components/redesign/redesign.module.css";
import { redesignFontClasses } from "../redesign/fonts";

export const metadata: Metadata = {
  title: "Privacy Policy | BLTZ",
  description: "What BLTZ collects through bltz.me, why, and the choices you have.",
};

// Plain-language draft written for the launch of the new landing pages.
// TODO: have it reviewed before collecting data at scale.
const UPDATED = "November 7, 2026";
const CONTACT = "dante@bltz.me";

export default function PrivacyPage() {
  return (
    <div data-redesign className={redesignFontClasses}>
      <main className={`${styles.page} ${styles.legalPage}`} data-audience="athletes">
        <header className={styles.legalHead}>
          <Link className={styles.brand} href="/" aria-label="BLTZ home">
            <Image src="/images/bltz-mark.svg" alt="" width={30} height={30} style={{ height: "auto" }} />
            <span>BLTZ</span>
          </Link>
        </header>
        <article className={styles.legalBody}>
          <h1 className={styles.h2}>Privacy policy</h1>
          <p className={styles.muted}>Last updated <span className={styles.num}>{UPDATED}</span></p>

          <h2>What we collect</h2>
          <ul>
            <li><strong>When you claim a locker:</strong> your name and email address.</li>
            <li><strong>When you request a demo:</strong> your name, work email, organization, organization type, and your role and message if you add them.</li>
            <li><strong>When you sign in:</strong> the account details you give us, and cookies that keep you signed in.</li>
            <li><strong>When you browse:</strong> basic usage information, such as the pages you visit and the device and browser you use.</li>
          </ul>

          <h2>How we use it</h2>
          <ul>
            <li>To save your spot and email you when your locker is ready.</li>
            <li>To reply to demo requests and schedule demos.</li>
            <li>To run, secure and improve BLTZ.</li>
          </ul>
          <p>We don&apos;t sell your personal information.</p>

          <h2>Who we share it with</h2>
          <p>
            Only the service providers that help us run BLTZ, such as our hosting, database and email providers. If you
            book through our calendar, the scheduling service receives the details you enter there. We may also share
            information when the law requires it.
          </p>

          <h2>Your choices</h2>
          <p>
            You can ask us to show, correct or delete the information we hold about you, or to stop emailing you. Email{" "}
            <a href={`mailto:${CONTACT}`}>{CONTACT}</a> and we&apos;ll take care of it.
          </p>

          <h2>Changes</h2>
          <p>If we change this policy, we&apos;ll update the date at the top of this page.</p>
        </article>
        <LegalBar />
      </main>
    </div>
  );
}
