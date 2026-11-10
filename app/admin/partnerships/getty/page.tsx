import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OriginalOverview from "../../getty-partnership/OriginalOverview";
import MeetingViews from "../../getty-partnership/MeetingViews";
import GettyCommercialModel from "../../getty-partnership/GettyCommercialModel";
import { OneSheet, ImageWorkflow } from "../../getty-partnership/PilotViews";
import styles from "../partnerships.module.css";

export const metadata: Metadata = { title: "Getty Images Partnership | BLTZ Admin" };

export default function GettyPartnershipPage() {
  return (
    <>
      <div className={styles.meetingBar}>
        <Link href="/admin/partnerships" className={styles.back}><ArrowLeft size={16} aria-hidden="true" /> Partnerships</Link>
      </div>
      <MeetingViews overview={<OriginalOverview />} oneSheet={<OneSheet />} workflow={<ImageWorkflow />} commercial={<GettyCommercialModel />} />
    </>
  );
}
