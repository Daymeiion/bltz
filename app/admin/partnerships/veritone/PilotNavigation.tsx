import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "../partnerships.module.css";

export default function PilotNavigation({ current }: { current: "one-sheet" | "workflow" }) {
  return (
    <nav className={styles.pilotNav} aria-label="Veritone pilot materials">
      <Link href="/admin/partnerships" className={styles.back}><ArrowLeft size={16} aria-hidden="true" /> Partnerships</Link>
      <div className={styles.views}>
        <Link href="/admin/partnerships/veritone" aria-current={current === "one-sheet" ? "page" : undefined}>One-sheet</Link>
        <Link href="/admin/partnerships/veritone/workflow" aria-current={current === "workflow" ? "page" : undefined}>Media workflow &amp; timeline</Link>
      </div>
    </nav>
  );
}
