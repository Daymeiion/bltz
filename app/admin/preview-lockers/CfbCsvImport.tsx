"use client";

import StatsCsvImport from "./StatsCsvImport";
import type { CfbImport } from "@/lib/preview-lockers/cfb-csv";

export default function CfbCsvImport(props: { athleteName: string; value: CfbImport[]; onChange: (value: CfbImport[]) => void }) {
  return <StatsCsvImport {...props} />;
}
