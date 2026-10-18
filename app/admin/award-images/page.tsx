import { previewAdmin } from "@/lib/preview-lockers/server";
import AwardImageLibrary from "./AwardImageLibrary";
export default async function Page(){await previewAdmin();return <AwardImageLibrary/>;}
