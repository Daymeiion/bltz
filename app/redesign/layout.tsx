import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redesignFontClasses } from "./fonts";

// Full redesign mockups. The hero sections are live at / and /enterprise;
// the rest of each page is still being designed here.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RedesignLayout({ children }: { children: ReactNode }) {
  return (
    <div data-redesign className={redesignFontClasses}>
      {children}
    </div>
  );
}
