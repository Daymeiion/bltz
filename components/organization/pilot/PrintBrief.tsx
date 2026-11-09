"use client";

import { IconDownload } from "@tabler/icons-react";

/** Saves the brief as a PDF through the browser's print dialog, using the brief's print styles. */
export function PrintBrief({ label = "Download PDF" }: { label?: string }) {
  return (
    <button type="button" className="brief-print" onClick={() => window.print()}>
      <IconDownload stroke={1.5} aria-hidden />{label}
    </button>
  );
}
