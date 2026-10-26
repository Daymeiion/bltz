import type { Metadata } from "next";
import OriginalOverview from "./OriginalOverview";
import MeetingViews from "./MeetingViews";
import GettyCommercialModel from "./GettyCommercialModel";
import { OneSheet, ImageWorkflow } from "./PilotViews";

export const metadata: Metadata = {
  title: "Getty Partnership | BLTZ Admin",
  robots: { index: false, follow: false },
};

export default function GettyPartnershipPage() {
  return <MeetingViews overview={<OriginalOverview />} oneSheet={<OneSheet />} workflow={<ImageWorkflow />} commercial={<GettyCommercialModel />} />;
}
