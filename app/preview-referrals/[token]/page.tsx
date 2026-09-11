import { notFound } from "next/navigation";
import { z } from "zod";
import { previewUser } from "@/lib/preview-lockers/server";
import ConversionJourney from "@/components/preview-lockers/ConversionJourney";
export const dynamic="force-dynamic";
export const metadata={title:"BLTZ teammate referral",robots:{index:false,follow:false},referrer:"no-referrer" as const};
export default async function Referral({params}:{params:Promise<{token:string}>}) {
  const {token}=await params;
  if(process.env.PREVIEW_CONVERSION_ENABLED !== "true" || !z.uuid().safeParse(token).success)notFound();
  await previewUser();
  return <main><ConversionJourney previewId={null} referralToken={token}/></main>;
}
