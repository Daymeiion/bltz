import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./partnerships.module.css";

export const metadata: Metadata = { title: "Partnerships | BLTZ Admin" };

const partners = [
  {
    name: "Getty Images",
    href: "/admin/partnerships/getty",
    status: "Meeting materials",
    summary: "Original overview, visual one-sheet, image workflow, and commercial model.",
    action: "Open Getty materials",
  },
  {
    name: "Veritone",
    href: "/admin/partnerships/veritone",
    status: "Proposed pilot",
    summary: "Sports archive licensing one-sheet, media handoff, and a proposed six-week timeline.",
    action: "Open Veritone pilot",
  },
];

export default function PartnershipsPage() {
  return (
    <div className={styles.workspace}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>BLTZ Admin / Meeting library</p>
        <h1>Partnerships</h1>
        <p className={styles.lede}>Choose a partner to open their presentation and meeting materials.</p>
      </header>
      <ul className={styles.cards} aria-label="Partnerships">
        {partners.map((partner) => (
          <li key={partner.href}>
            <Link href={partner.href} className={styles.card}>
              <p className={styles.eyebrow}>{partner.status}</p>
              <h2>{partner.name}</h2>
              <p className={styles.copy}>{partner.summary}</p>
              <span className={styles.cardAction}>{partner.action} <ArrowRight size={18} aria-hidden="true" /></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
